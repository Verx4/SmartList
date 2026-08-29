package br.com.minhalista.usuario;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface UsuarioRepository extends JpaRepository<Usuario, UUID> {

    Optional<Usuario> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByCpf(String cpf);

    long countByTipoAcesso(TipoAcesso tipoAcesso);

    long countByPerfil(Perfil perfil);

    List<Usuario> findAllByPerfilOrderByNomeAsc(Perfil perfil);

    List<Usuario> findAllByOrderByCriadoEmDesc();

    @Modifying
    @Transactional
    @Query("""
        update Usuario usuario
           set usuario.ultimoAcessoEm = :agora
         where usuario.ultimoAcessoEm is null
        """)
    int inicializarUltimosAcessosAusentes(@Param("agora") Instant agora);

    @Modifying
    @Transactional
    @Query("""
        update Usuario usuario
           set usuario.ultimoAcessoEm = :agora
         where usuario.id = :usuarioId
           and (usuario.ultimoAcessoEm is null or usuario.ultimoAcessoEm <= :limite)
        """)
    int registrarAtividadeSeNecessario(
        @Param("usuarioId") UUID usuarioId,
        @Param("agora") Instant agora,
        @Param("limite") Instant limite
    );
}
