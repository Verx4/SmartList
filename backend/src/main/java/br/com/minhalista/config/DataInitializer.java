package br.com.minhalista.config;

import java.time.Instant;
import java.util.Locale;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import br.com.minhalista.usuario.Perfil;
import br.com.minhalista.usuario.TipoAcesso;
import br.com.minhalista.usuario.Usuario;
import br.com.minhalista.usuario.UsuarioRepository;

@Component
public class DataInitializer implements ApplicationRunner {

    private static final String EMAIL_ADMIN_PRINCIPAL = "smartlistevx@gmail.com";
    private static final Instant ACESSO_PERMANENTE = Instant.parse("2999-12-31T23:59:59Z");

    private final UsuarioRepository repository;
    private final PasswordEncoder passwordEncoder;
    private final String nome;
    private final String email;
    private final String senha;

    public DataInitializer(
        UsuarioRepository repository,
        PasswordEncoder passwordEncoder,
        @Value("${app.admin.nome:Administrador}") String nome,
        @Value("${app.admin.email:}") String email,
        @Value("${app.admin.senha:}") String senha
    ) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
        this.nome = nome;
        this.email = email;
        this.senha = senha;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        repository.inicializarUltimosAcessosAusentes(Instant.now());
        repository.findByEmailIgnoreCase(EMAIL_ADMIN_PRINCIPAL)
            .ifPresent(this::garantirAdministradorPrincipal);

        if (!StringUtils.hasText(email) || !StringUtils.hasText(senha)) {
            return;
        }

        String emailNormalizado = email.trim().toLowerCase(Locale.ROOT);

        Usuario usuarioExistente = repository
            .findByEmailIgnoreCase(emailNormalizado)
            .orElse(null);

        if (usuarioExistente != null) {
            promoverAdministrador(usuarioExistente);
            return;
        }

        Usuario admin = new Usuario();
        admin.setNome(nome.trim());
        admin.setEmail(emailNormalizado);
        admin.setSenhaHash(passwordEncoder.encode(senha));
        admin.setPerfil(Perfil.ADMIN);
        admin.setTipoAcesso(TipoAcesso.CORTESIA);
        admin.setCortesiaAte(Instant.parse("2999-12-31T23:59:59Z"));
        admin.setAtivo(true);
        admin.setAceiteTermosEm(Instant.now());
        repository.save(admin);
    }

    private void garantirAdministradorPrincipal(Usuario usuario) {
        usuario.setPerfil(Perfil.ADMIN);
        usuario.setTipoAcesso(TipoAcesso.CORTESIA);
        usuario.setCortesiaAte(ACESSO_PERMANENTE);
        usuario.setAtivo(true);
        usuario.setExclusaoSolicitadaEm(null);
        repository.save(usuario);
    }

    private void promoverAdministrador(Usuario usuario) {
        if (usuario.getPerfil() == Perfil.ADMIN) {
            return;
        }

        usuario.setSenhaHash(passwordEncoder.encode(senha));
        usuario.setPerfil(Perfil.ADMIN);
        usuario.setTipoAcesso(TipoAcesso.CORTESIA);
        usuario.setCortesiaAte(Instant.parse("2999-12-31T23:59:59Z"));
        usuario.setAtivo(true);
        repository.save(usuario);
    }
}
