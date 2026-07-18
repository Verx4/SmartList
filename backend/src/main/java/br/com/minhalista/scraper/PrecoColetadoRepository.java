package br.com.minhalista.scraper;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PrecoColetadoRepository extends JpaRepository<PrecoColetado, UUID> {

    List<PrecoColetado> findTop100ByProdutoContainingIgnoreCaseOrderByPrecoOriginalAscColetadoEmDesc(
        String produto
    );
}
