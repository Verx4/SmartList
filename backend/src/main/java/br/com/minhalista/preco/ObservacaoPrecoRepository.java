package br.com.minhalista.preco;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ObservacaoPrecoRepository
    extends JpaRepository<ObservacaoPreco, UUID>, JpaSpecificationExecutor<ObservacaoPreco> {

    boolean existsByOrigemAndCompraChaveAndItemChave(
        OrigemPreco origem,
        String compraChave,
        String itemChave
    );

    Page<ObservacaoPreco> findByProdutoIdOrderByRealizadaEmDesc(UUID produtoId, Pageable pageable);

    @Query("""
        select o.produto.id as produtoId,
               count(o) as totalObservacoes,
               min(o.precoUnitario) as precoMinimo,
               avg(o.precoUnitario) as precoMedio,
               max(o.precoUnitario) as precoMaximo,
               max(o.realizadaEm) as ultimaCompraEm
          from ObservacaoPreco o
         where o.produto.id in :produtoIds
         group by o.produto.id
        """)
    List<AgregadoProduto> agregarPorProdutos(@Param("produtoIds") Collection<UUID> produtoIds);

    @Query("""
        select count(o) as totalObservacoes,
               count(distinct o.produto.id) as totalProdutos,
               count(distinct o.mercado) as totalMercados,
               count(distinct o.estado) as totalEstados,
               min(o.realizadaEm) as primeiraCompraEm,
               max(o.realizadaEm) as ultimaCompraEm
          from ObservacaoPreco o
        """)
    ResumoGeral resumir();

    @Query("""
        select coalesce(o.estado, 'Não informado') as nome,
               count(o) as totalObservacoes,
               avg(o.precoUnitario) as precoMedio
          from ObservacaoPreco o
         group by coalesce(o.estado, 'Não informado')
         order by count(o) desc
        """)
    List<AnaliseAgrupada> analisarPorEstado();

    @Query("""
        select coalesce(o.mercado, 'Não informado') as nome,
               count(o) as totalObservacoes,
               avg(o.precoUnitario) as precoMedio
          from ObservacaoPreco o
         group by coalesce(o.mercado, 'Não informado')
         order by count(o) desc
        """)
    List<AnaliseAgrupada> analisarPorMercado();

    @Query("select distinct o.mercado from ObservacaoPreco o where o.mercado is not null order by o.mercado")
    List<String> listarMercados();

    @Query("select distinct o.cidade from ObservacaoPreco o where o.cidade is not null order by o.cidade")
    List<String> listarCidades();

    @Query("select distinct o.estado from ObservacaoPreco o where o.estado is not null order by o.estado")
    List<String> listarEstados();

    interface AgregadoProduto {
        UUID getProdutoId();
        long getTotalObservacoes();
        BigDecimal getPrecoMinimo();
        Double getPrecoMedio();
        BigDecimal getPrecoMaximo();
        Instant getUltimaCompraEm();
    }

    interface ResumoGeral {
        long getTotalObservacoes();
        long getTotalProdutos();
        long getTotalMercados();
        long getTotalEstados();
        Instant getPrimeiraCompraEm();
        Instant getUltimaCompraEm();
    }

    interface AnaliseAgrupada {
        String getNome();
        long getTotalObservacoes();
        Double getPrecoMedio();
    }
}
