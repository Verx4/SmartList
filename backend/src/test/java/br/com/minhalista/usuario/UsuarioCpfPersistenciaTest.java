package br.com.minhalista.usuario;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;

@SpringBootTest
@Transactional
class UsuarioCpfPersistenciaTest {

    @Autowired
    private UsuarioRepository repository;

    @Autowired
    private EntityManager entityManager;

    @Test
    void persisteCpfNaColunaDoUsuarioERecuperaAposLimparOContexto() {
        Usuario usuario = new Usuario();
        usuario.setNome("Cliente CPF");
        usuario.setEmail("cliente.cpf@example.com");
        usuario.setCpf("52998224725");
        usuario.setSenhaHash("senha-hash");
        usuario.setPerfil(Perfil.USUARIO);
        usuario.setTipoAcesso(TipoAcesso.FREE);
        usuario.setAtivo(true);

        repository.saveAndFlush(usuario);
        entityManager.clear();

        Usuario persistido = repository
            .findByEmailIgnoreCase("cliente.cpf@example.com")
            .orElseThrow();

        assertEquals("52998224725", persistido.getCpf());
        assertTrue(repository.existsByCpf("52998224725"));
    }
}
