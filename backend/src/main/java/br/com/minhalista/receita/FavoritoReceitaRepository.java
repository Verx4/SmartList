package br.com.minhalista.receita;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface FavoritoReceitaRepository extends JpaRepository<FavoritoReceita, UUID> {
    List<FavoritoReceita> findByUsuarioId(UUID usuarioId);
    Optional<FavoritoReceita> findByUsuarioIdAndReceitaId(UUID usuarioId, String receitaId);
    boolean existsByUsuarioIdAndReceitaId(UUID usuarioId, String receitaId);
}
