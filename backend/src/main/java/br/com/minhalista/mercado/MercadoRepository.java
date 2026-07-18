package br.com.minhalista.mercado;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface MercadoRepository extends JpaRepository<Mercado, UUID> {

    List<Mercado> findByUsuarioIdOrderByFavoritoDescNomeAsc(UUID usuarioId);

    Optional<Mercado> findByIdAndUsuarioId(UUID id, UUID usuarioId);

    boolean existsByUsuarioIdAndNomeIgnoreCase(UUID usuarioId, String nome);

    long countByFavoritoTrue();
}
