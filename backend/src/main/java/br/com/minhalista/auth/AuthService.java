package br.com.minhalista.auth;

import java.time.Instant;
import java.util.Locale;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.minhalista.auth.dto.AuthResponse;
import br.com.minhalista.auth.dto.CadastroRequest;
import br.com.minhalista.auth.dto.LoginRequest;
import br.com.minhalista.auth.dto.UsuarioResponse;
import br.com.minhalista.assinatura.AssinaturaValidadeService;
import br.com.minhalista.common.RegraNegocioException;
import br.com.minhalista.usuario.Perfil;
import br.com.minhalista.usuario.Cpf;
import br.com.minhalista.usuario.TipoAcesso;
import br.com.minhalista.usuario.Usuario;
import br.com.minhalista.usuario.UsuarioRepository;

@Service
public class AuthService {

    private static final Logger LOGGER = LoggerFactory.getLogger(AuthService.class);

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AssinaturaValidadeService assinaturaValidadeService;

    public AuthService(
        UsuarioRepository usuarioRepository,
        PasswordEncoder passwordEncoder,
        JwtService jwtService,
        AssinaturaValidadeService assinaturaValidadeService
    ) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.assinaturaValidadeService = assinaturaValidadeService;
    }

    @Transactional
    public UsuarioResponse cadastrar(CadastroRequest request) {
        String email = normalizarEmail(request.email());
        if (!Cpf.valido(request.cpf())) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "Informe um CPF válido.");
        }

        String cpf = Cpf.somenteDigitos(request.cpf());

        if (usuarioRepository.existsByEmailIgnoreCase(email)) {
            throw new RegraNegocioException(HttpStatus.CONFLICT, "Este e-mail já está cadastrado.");
        }

        if (usuarioRepository.existsByCpf(cpf)) {
            throw new RegraNegocioException(HttpStatus.CONFLICT, "Este CPF já está cadastrado.");
        }

        Usuario usuario = new Usuario();
        usuario.setNome(request.nome().trim());
        usuario.setEstado(request.estado().trim().toUpperCase(Locale.ROOT));
        usuario.setCidade(request.cidade().trim());
        usuario.setEmail(email);
        usuario.setCpf(cpf);
        usuario.setSenhaHash(passwordEncoder.encode(request.senha()));
        usuario.setPerfil(Perfil.USUARIO);
        usuario.setTipoAcesso(TipoAcesso.FREE);
        usuario.setAtivo(true);
        usuario.setAceiteTermosEm(Instant.now());
        usuario.setAceiteMarketing(Boolean.TRUE.equals(request.aceiteMarketing()));

        try {
            return UsuarioResponse.de(usuarioRepository.saveAndFlush(usuario));
        } catch (DataIntegrityViolationException erro) {
            throw new RegraNegocioException(
                HttpStatus.CONFLICT,
                "E-mail ou CPF já cadastrado."
            );
        }
    }

    public AuthResponse login(LoginRequest request) {
        Usuario usuario = usuarioRepository.findByEmailIgnoreCase(normalizarEmail(request.email()))
            .orElseThrow(this::credenciaisInvalidas);

        if (!usuario.isAtivo() || !passwordEncoder.matches(request.senha(), usuario.getSenhaHash())) {
            throw credenciaisInvalidas();
        }

        sincronizarAssinaturaSemBloquearLogin(usuario);
        usuario.setUltimoAcessoEm(Instant.now());
        usuarioRepository.save(usuario);

        return new AuthResponse(
            jwtService.gerarToken(usuario),
            "Bearer",
            jwtService.getExpiracaoSegundos(),
            UsuarioResponse.de(usuario)
        );
    }

    private void sincronizarAssinaturaSemBloquearLogin(Usuario usuario) {
        try {
            assinaturaValidadeService.sincronizarUsuario(usuario);
        } catch (RuntimeException erro) {
            LOGGER.error(
                "Falha ao sincronizar a assinatura durante o login do usuário {}.",
                usuario.getId(),
                erro
            );
        }
    }

    private RegraNegocioException credenciaisInvalidas() {
        return new RegraNegocioException(HttpStatus.UNAUTHORIZED, "E-mail ou senha inválidos.");
    }

    private String normalizarEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
