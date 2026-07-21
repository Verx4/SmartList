
package br.com.minhalista.scraper;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface PrecoColetadoRepository extends JpaRepository<PrecoColetado, UUID> {

    List<PrecoColetado> findTop100ByProdutoContainingIgnoreCaseOrderByPrecoOriginalAscColetadoEmDesc(
        String produto
    );

    @Query("select distinct p.produto from PrecoColetado p order by p.produto")
    List<String> encontrarProdutosMonitorados(Pageable pagina);
}

