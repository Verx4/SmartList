package br.com.minhalista.usuario;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface UsuarioRepository extends JpaRepository<Usuario, UUID> {

    Optional<Usuario> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    long countByTipoAcesso(TipoAcesso tipoAcesso);

    List<Usuario> findAllByOrderByCriadoEmDesc();
}
