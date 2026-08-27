package br.com.minhalista.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import br.com.minhalista.usuario.Perfil;
import br.com.minhalista.usuario.TipoAcesso;
import br.com.minhalista.usuario.Usuario;
import br.com.minhalista.usuario.UsuarioRepository;

@ExtendWith(MockitoExtension.class)
class DataInitializerTest {

    @Mock
    private UsuarioRepository repository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Test
    void devePromoverContaExistenteSemPerderOUsuario() {
        Usuario usuario = new Usuario();
        usuario.setNome("Fernando");
        usuario.setEmail("fernandomfp.s@gmail.com");
        usuario.setSenhaHash("hash-anterior");
        usuario.setPerfil(Perfil.USUARIO);
        usuario.setTipoAcesso(TipoAcesso.FREE);

        when(repository.findByEmailIgnoreCase("fernandomfp.s@gmail.com"))
            .thenReturn(Optional.of(usuario));
        when(passwordEncoder.encode("nova-senha-forte"))
            .thenReturn("novo-hash");

        DataInitializer initializer = new DataInitializer(
            repository,
            passwordEncoder,
            "Administrador",
            " FernandoMFP.S@gmail.com ",
            "nova-senha-forte"
        );

        initializer.run(null);

        assertThat(usuario.getPerfil()).isEqualTo(Perfil.ADMIN);
        assertThat(usuario.getTipoAcesso()).isEqualTo(TipoAcesso.CORTESIA);
        assertThat(usuario.getCortesiaAte()).isNotNull();
        assertThat(usuario.isAtivo()).isTrue();
        assertThat(usuario.getSenhaHash()).isEqualTo("novo-hash");
        verify(repository).inicializarUltimosAcessosAusentes(any());
        verify(repository).save(usuario);
    }

    @Test
    void naoDeveSobrescreverSenhaDeContaQueJaEhAdministradora() {
        Usuario admin = new Usuario();
        admin.setEmail("admin@teste.local");
        admin.setSenhaHash("senha-alterada-pelo-admin");
        admin.setPerfil(Perfil.ADMIN);

        when(repository.findByEmailIgnoreCase("admin@teste.local"))
            .thenReturn(Optional.of(admin));

        DataInitializer initializer = new DataInitializer(
            repository,
            passwordEncoder,
            "Administrador",
            "admin@teste.local",
            "senha-antiga-do-ambiente"
        );

        initializer.run(null);

        assertThat(admin.getSenhaHash()).isEqualTo("senha-alterada-pelo-admin");
        verify(passwordEncoder, never()).encode("senha-antiga-do-ambiente");
        verify(repository, never()).save(admin);
    }
}
