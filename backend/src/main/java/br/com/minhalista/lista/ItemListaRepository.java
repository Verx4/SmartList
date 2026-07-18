package br.com.minhalista.lista;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ItemListaRepository extends JpaRepository<ItemLista, UUID> {

    Optional<ItemLista> findByIdAndListaId(UUID id, UUID listaId);
}
