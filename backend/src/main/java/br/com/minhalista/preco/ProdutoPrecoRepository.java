package br.com.minhalista.preco;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface ProdutoPrecoRepository
    extends JpaRepository<ProdutoPreco, UUID>, JpaSpecificationExecutor<ProdutoPreco> {

    Optional<ProdutoPreco> findByNomeNormalizado(String nomeNormalizado);
}
