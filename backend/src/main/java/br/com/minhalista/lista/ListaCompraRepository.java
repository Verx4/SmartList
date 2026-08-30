package br.com.minhalista.lista;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ListaCompraRepository extends JpaRepository<ListaCompra, UUID> {

    Optional<ListaCompra> findFirstByUsuarioIdAndStatusOrderByCriadoEmDesc(
        UUID usuarioId,
        StatusLista status
    );

    List<ListaCompra> findByUsuarioIdAndStatusOrderByFinalizadoEmDesc(
        UUID usuarioId,
        StatusLista status
    );

    Optional<ListaCompra> findByIdAndUsuarioId(UUID id, UUID usuarioId);

    @EntityGraph(attributePaths = { "usuario", "mercado", "itens" })
    List<ListaCompra> findByStatusOrderByFinalizadoEmAsc(StatusLista status);

    long countByStatus(StatusLista status);
}
