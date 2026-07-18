package br.com.minhalista.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import br.com.minhalista.usuario.Usuario;

@Service
public class JwtService {

    private static final String ALGORITMO = "HmacSHA256";

    private final ObjectMapper objectMapper;
    private final byte[] segredo;
    private final long expiracaoMinutos;

    public JwtService(
        ObjectMapper objectMapper,
        @Value("${app.jwt.secret}") String segredo,
        @Value("${app.jwt.expiracao-minutos}") long expiracaoMinutos
    ) {
        if (segredo == null || segredo.length() < 32) {
            throw new IllegalStateException("JWT_SECRET deve possuir pelo menos 32 caracteres.");
        }

        this.objectMapper = objectMapper;
        this.segredo = segredo.getBytes(StandardCharsets.UTF_8);
        this.expiracaoMinutos = expiracaoMinutos;
    }

    public String gerarToken(Usuario usuario) {
        Instant agora = Instant.now();

        Map<String, Object> cabecalho = Map.of(
            "alg", "HS256",
            "typ", "JWT"
        );

        Map<String, Object> dados = new LinkedHashMap<>();
        dados.put("sub", usuario.getEmail());
        dados.put("uid", usuario.getId().toString());
        dados.put("nome", usuario.getNome());
        dados.put("perfil", usuario.getPerfil().name());
        dados.put("tipoAcesso", usuario.getTipoAcesso().name());
        dados.put("iat", agora.getEpochSecond());
        dados.put("exp", agora.plus(expiracaoMinutos, ChronoUnit.MINUTES).getEpochSecond());

        try {
            String parteCabecalho = codificar(objectMapper.writeValueAsBytes(cabecalho));
            String parteDados = codificar(objectMapper.writeValueAsBytes(dados));
            String conteudo = parteCabecalho + "." + parteDados;

            return conteudo + "." + codificar(assinar(conteudo));
        } catch (Exception erro) {
            throw new IllegalStateException("Não foi possível gerar o token de acesso.", erro);
        }
    }

    public String extrairEmail(String token) {
        Map<String, Object> dados = validarELer(token);
        Object assunto = dados.get("sub");

        if (assunto == null || assunto.toString().isBlank()) {
            throw new IllegalArgumentException("Token sem usuário.");
        }

        return assunto.toString();
    }

    public long getExpiracaoSegundos() {
        return expiracaoMinutos * 60;
    }

    private Map<String, Object> validarELer(String token) {
        try {
            String[] partes = token.split("\\.");

            if (partes.length != 3) {
                throw new IllegalArgumentException("Token inválido.");
            }

            String conteudo = partes[0] + "." + partes[1];
            byte[] assinaturaRecebida = Base64.getUrlDecoder().decode(partes[2]);
            byte[] assinaturaEsperada = assinar(conteudo);

            if (!MessageDigest.isEqual(assinaturaRecebida, assinaturaEsperada)) {
                throw new IllegalArgumentException("Assinatura do token inválida.");
            }

            Map<String, Object> dados = objectMapper.readValue(
                Base64.getUrlDecoder().decode(partes[1]),
                new TypeReference<Map<String, Object>>() { }
            );

            Number expiracao = (Number) dados.get("exp");

            if (expiracao == null || Instant.now().getEpochSecond() >= expiracao.longValue()) {
                throw new IllegalArgumentException("Token expirado.");
            }

            return dados;
        } catch (IllegalArgumentException erro) {
            throw erro;
        } catch (Exception erro) {
            throw new IllegalArgumentException("Token inválido.", erro);
        }
    }

    private byte[] assinar(String conteudo) throws Exception {
        Mac mac = Mac.getInstance(ALGORITMO);
        mac.init(new SecretKeySpec(segredo, ALGORITMO));
        return mac.doFinal(conteudo.getBytes(StandardCharsets.UTF_8));
    }

    private String codificar(byte[] valor) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(valor);
    }
}
