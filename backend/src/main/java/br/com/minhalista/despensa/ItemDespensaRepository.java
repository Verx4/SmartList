package br.com.minhalista.despensa;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ItemDespensaRepository extends JpaRepository<ItemDespensa, UUID> {
    List<ItemDespensa> findByUsuarioIdOrderByNomeAsc(UUID usuarioId);
    Optional<ItemDespensa> findByIdAndUsuarioId(UUID id, UUID usuarioId);
    Optional<ItemDespensa> findByUsuarioIdAndChaveProdutoAndUnidade(UUID usuarioId, String chaveProduto, String unidade);
    Optional<ItemDespensa> findFirstByUsuarioIdAndChaveProduto(UUID usuarioId, String chaveProduto);
}
