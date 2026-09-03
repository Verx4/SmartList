package br.com.minhalista.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.minhalista.auth.dto.CodigoRecuperacaoResponse;
import br.com.minhalista.auth.dto.MensagemResponse;
import br.com.minhalista.auth.dto.RecuperarSenhaRequest;
import br.com.minhalista.auth.dto.RedefinirSenhaRequest;
import br.com.minhalista.auth.dto.VerificarCodigoRecuperacaoRequest;
import br.com.minhalista.common.RegraNegocioException;
import br.com.minhalista.usuario.Usuario;
import br.com.minhalista.usuario.UsuarioRepository;

@Service
public class PasswordResetService {

    public static final String MENSAGEM_GENERICA =
        "Se este e-mail estiver cadastrado, enviaremos um código de recuperação.";

    private static final Logger LOGGER = LoggerFactory.getLogger(PasswordResetService.class);
    private static final String HMAC_ALGORITMO = "HmacSHA256";

    private final PasswordResetTokenRepository tokenRepository;
    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailRecuperacaoService emailService;
    private final PasswordResetProperties properties;
    private final SecureRandom secureRandom = new SecureRandom();

    public PasswordResetService(
        PasswordResetTokenRepository tokenRepository,
        UsuarioRepository usuarioRepository,
        PasswordEncoder passwordEncoder,
        EmailRecuperacaoService emailService,
        PasswordResetProperties properties
    ) {
        this.tokenRepository = tokenRepository;
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.properties = properties;

        if (properties.getPepper() == null || properties.getPepper().length() < 32) {
            throw new IllegalStateException(
                "PASSWORD_RESET_PEPPER deve possuir pelo menos 32 caracteres."
            );
        }
    }

    @Transactional
    public MensagemResponse solicitarRecuperacao(
        RecuperarSenhaRequest request,
        String ipCliente
    ) {
        if (!emailService.disponivel()) {
            throw new RegraNegocioException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "O envio do código por e-mail está temporariamente indisponível."
            );
        }

        Instant agora = Instant.now();
        String email = normalizarEmail(request.email());
        String emailHash = hashIdentificador("email", email);
        String ipHash = hashIdentificador("ip", ipCliente == null ? "" : ipCliente);
        Instant inicioJanela = agora.minus(
            properties.getJanelaSolicitacoesMinutos(),
            ChronoUnit.MINUTES
        );

        validarLimites(emailHash, ipHash, agora, inicioJanela);

        tokenRepository.invalidarPendentesPorEmail(emailHash, agora);

        String codigo = "%06d".formatted(100000 + secureRandom.nextInt(900000));
        Usuario usuario = usuarioRepository.findByEmailIgnoreCase(email)
            .filter(Usuario::isAtivo)
            .orElse(null);

        PasswordResetToken token = new PasswordResetToken();
        token.setUsuario(usuario);
        token.setEmailHash(emailHash);
        token.setIpHash(ipHash);
        token.setCodigoHash(passwordEncoder.encode(codigo));
        token.setCriadoEm(agora);
        token.setExpiraEm(
            agora.plus(properties.getCodigoExpiracaoMinutos(), ChronoUnit.MINUTES)
        );
        token.setTentativas(0);
        tokenRepository.saveAndFlush(token);

        if (usuario != null) {
            try {
                emailService.enviarCodigo(usuario.getEmail(), usuario.getNome(), codigo);
            } catch (RuntimeException erro) {
                LOGGER.error("Falha ao enviar e-mail de recuperação de senha.", erro);
                throw new RegraNegocioException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Não foi possível enviar o código agora. Tente novamente em alguns minutos."
                );
            }
        }

        return new MensagemResponse(MENSAGEM_GENERICA);
    }

    @Transactional(noRollbackFor = RegraNegocioException.class)
    public CodigoRecuperacaoResponse verificarCodigo(
        VerificarCodigoRecuperacaoRequest request
    ) {
        Instant agora = Instant.now();
        String emailHash = hashIdentificador("email", normalizarEmail(request.email()));
        PasswordResetToken token = tokenRepository
            .findFirstByEmailHashOrderByCriadoEmDesc(emailHash)
            .orElseThrow(this::codigoInvalido);

        validarEstadoDoCodigo(token, agora);

        if (token.getTentativas() >= properties.getMaxTentativasCodigo()) {
            throw limiteTentativas();
        }

        if (token.getUsuario() == null
            || !passwordEncoder.matches(request.codigo(), token.getCodigoHash())) {
            token.setTentativas(token.getTentativas() + 1);
            tokenRepository.saveAndFlush(token);
            if (token.getTentativas() >= properties.getMaxTentativasCodigo()) {
                throw limiteTentativas();
            }
            throw codigoInvalido();
        }

        String tokenAberto = gerarTokenSeguro();
        token.setTokenRedefinicaoHash(hashToken(tokenAberto));
        token.setVerificadoEm(agora);
        tokenRepository.saveAndFlush(token);

        long segundosRestantes = Math.max(
            1,
            Duration.between(agora, token.getExpiraEm()).getSeconds()
        );
        return new CodigoRecuperacaoResponse(tokenAberto, segundosRestantes);
    }

    @Transactional
    public MensagemResponse redefinirSenha(RedefinirSenhaRequest request) {
        if (!request.novaSenha().equals(request.confirmarSenha())) {
            throw new RegraNegocioException(
                HttpStatus.BAD_REQUEST,
                "As senhas não coincidem."
            );
        }

        Instant agora = Instant.now();
        PasswordResetToken token = tokenRepository
            .findByTokenRedefinicaoHash(hashToken(request.token()))
            .orElseThrow(() -> new RegraNegocioException(
                HttpStatus.BAD_REQUEST,
                "A autorização para redefinir a senha é inválida. Solicite um novo código."
            ));

        if (token.getUtilizadoEm() != null) {
            throw new RegraNegocioException(
                HttpStatus.BAD_REQUEST,
                "Este código já foi utilizado. Solicite um novo código."
            );
        }
        if (token.getInvalidadoEm() != null || token.getVerificadoEm() == null) {
            throw new RegraNegocioException(
                HttpStatus.BAD_REQUEST,
                "Este código não está mais válido. Solicite um novo código."
            );
        }
        if (!token.getExpiraEm().isAfter(agora)) {
            throw codigoExpirado();
        }

        Usuario usuario = token.getUsuario();
        if (usuario == null || !usuario.isAtivo()) {
            throw new RegraNegocioException(
                HttpStatus.BAD_REQUEST,
                "Não foi possível redefinir a senha. Solicite um novo código."
            );
        }
        if (passwordEncoder.matches(request.novaSenha(), usuario.getSenhaHash())) {
            throw new RegraNegocioException(
                HttpStatus.BAD_REQUEST,
                "A nova senha deve ser diferente da senha atual."
            );
        }

        usuario.setSenhaHash(passwordEncoder.encode(request.novaSenha()));
        token.setUtilizadoEm(agora);
        usuarioRepository.saveAndFlush(usuario);
        tokenRepository.saveAndFlush(token);

        return new MensagemResponse("Senha alterada com sucesso.");
    }

    private void validarLimites(
        String emailHash,
        String ipHash,
        Instant agora,
        Instant inicioJanela
    ) {
        tokenRepository.findFirstByEmailHashOrderByCriadoEmDesc(emailHash)
            .filter(ultimo -> ultimo.getCriadoEm().isAfter(
                agora.minus(properties.getIntervaloReenvioSegundos(), ChronoUnit.SECONDS)
            ))
            .ifPresent(ultimo -> {
                throw new RegraNegocioException(
                    HttpStatus.TOO_MANY_REQUESTS,
                    "Aguarde um minuto antes de solicitar um novo código."
                );
            });

        if (tokenRepository.countByEmailHashAndCriadoEmGreaterThanEqual(
            emailHash,
            inicioJanela
        ) >= properties.getMaxSolicitacoesPorEmail()) {
            throw new RegraNegocioException(
                HttpStatus.TOO_MANY_REQUESTS,
                "Muitas solicitações para este e-mail. Aguarde alguns minutos e tente novamente."
            );
        }
        if (tokenRepository.countByIpHashAndCriadoEmGreaterThanEqual(
            ipHash,
            inicioJanela
        ) >= properties.getMaxSolicitacoesPorIp()) {
            throw new RegraNegocioException(
                HttpStatus.TOO_MANY_REQUESTS,
                "Muitas solicitações foram realizadas. Aguarde alguns minutos e tente novamente."
            );
        }
    }

    private void validarEstadoDoCodigo(PasswordResetToken token, Instant agora) {
        if (token.getUtilizadoEm() != null) {
            throw new RegraNegocioException(
                HttpStatus.BAD_REQUEST,
                "Este código já foi utilizado. Solicite um novo código."
            );
        }
        if (token.getInvalidadoEm() != null) {
            throw new RegraNegocioException(
                HttpStatus.BAD_REQUEST,
                "Este código não está mais válido. Solicite um novo código."
            );
        }
        if (!token.getExpiraEm().isAfter(agora)) throw codigoExpirado();
        if (token.getVerificadoEm() != null) {
            throw new RegraNegocioException(
                HttpStatus.BAD_REQUEST,
                "Este código já foi confirmado. Solicite um novo código se necessário."
            );
        }
    }

    private RegraNegocioException codigoInvalido() {
        return new RegraNegocioException(
            HttpStatus.BAD_REQUEST,
            "Código inválido. Verifique o código enviado para seu e-mail."
        );
    }

    private RegraNegocioException codigoExpirado() {
        return new RegraNegocioException(
            HttpStatus.BAD_REQUEST,
            "Este código expirou. Solicite um novo código."
        );
    }

    private RegraNegocioException limiteTentativas() {
        return new RegraNegocioException(
            HttpStatus.TOO_MANY_REQUESTS,
            "O número máximo de tentativas foi atingido. Solicite um novo código."
        );
    }

    private String gerarTokenSeguro() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hashToken(String token) {
        try {
            return HexFormat.of().formatHex(
                MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8))
            );
        } catch (Exception erro) {
            throw new IllegalStateException("Não foi possível proteger o token.", erro);
        }
    }

    private String hashIdentificador(String tipo, String valor) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITMO);
            mac.init(new SecretKeySpec(
                properties.getPepper().getBytes(StandardCharsets.UTF_8),
                HMAC_ALGORITMO
            ));
            return HexFormat.of().formatHex(
                mac.doFinal((tipo + ":" + valor).getBytes(StandardCharsets.UTF_8))
            );
        } catch (Exception erro) {
            throw new IllegalStateException("Não foi possível proteger a solicitação.", erro);
        }
    }

    private String normalizarEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
