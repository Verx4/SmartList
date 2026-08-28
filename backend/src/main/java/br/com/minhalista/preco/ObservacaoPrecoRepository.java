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
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ObservacaoPrecoRepository
    extends JpaRepository<ObservacaoPreco, UUID>, JpaSpecificationExecutor<ObservacaoPreco> {

    boolean existsByOrigemAndCompraChaveAndItemChave(
        OrigemPreco origem,
        String compraChave,
        String itemChave
    );

    boolean existsByProdutoId(UUID produtoId);

    Page<ObservacaoPreco> findByProdutoIdOrderByRealizadaEmDesc(UUID produtoId, Pageable pageable);

    List<ObservacaoPreco> findByOrigemAndCompraChaveOrderByCriadoEmAsc(OrigemPreco origem, String compraChave);

    @EntityGraph(attributePaths = { "produto", "usuario" })
    List<ObservacaoPreco> findByUsuario_IdAndOrigemOrderByRealizadaEmDescCriadoEmAsc(
        UUID usuarioId,
        OrigemPreco origem
    );

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
        select count(distinct o.compraChave) as totalCompras,
               count(o) as totalItens,
               count(distinct o.usuario.id) as totalUsuarios,
               count(distinct o.mercado) as totalMercados,
               coalesce(sum(o.subtotal), 0) as valorTotal
          from ObservacaoPreco o
         where o.origem = br.com.minhalista.preco.OrigemPreco.COMPRA_USUARIO
        """)
    ResumoCompras resumirCompras();

    @Query("""
        select o.compraChave as compraId,
               o.usuario.id as usuarioId,
               o.usuario.nome as usuarioNome,
               o.mercado as mercado,
               o.cidade as cidade,
               o.estado as estado,
               max(o.realizadaEm) as realizadaEm,
               count(o) as totalItens,
               sum(o.subtotal) as valorTotal
          from ObservacaoPreco o
         where o.origem = br.com.minhalista.preco.OrigemPreco.COMPRA_USUARIO
           and (:mercado = '' or o.mercado = :mercado)
           and (:usuario = '' or lower(o.usuario.nome) = lower(:usuario))
           and o.realizadaEm >= coalesce(:inicio, o.realizadaEm)
           and o.realizadaEm <= coalesce(:fim, o.realizadaEm)
           and (
                :busca = ''
                or lower(o.compraChave) like lower(concat('%', :busca, '%'))
                or lower(coalesce(o.mercado, '')) like lower(concat('%', :busca, '%'))
                or lower(coalesce(o.usuario.nome, '')) like lower(concat('%', :busca, '%'))
                or exists (
                    select x.id from ObservacaoPreco x
                     where x.compraChave = o.compraChave
                       and lower(x.nomeOriginal) like lower(concat('%', :busca, '%'))
                )
           )
         group by o.compraChave, o.usuario.id, o.usuario.nome, o.mercado, o.cidade, o.estado
         order by max(o.realizadaEm) desc
        """)
    List<CompraAgregada> listarCompras(
        @Param("busca") String busca,
        @Param("mercado") String mercado,
        @Param("usuario") String usuario,
        @Param("inicio") Instant inicio,
        @Param("fim") Instant fim,
        Pageable pageable
    );

    @Query("""
        select count(distinct o.compraChave)
          from ObservacaoPreco o
         where o.origem = br.com.minhalista.preco.OrigemPreco.COMPRA_USUARIO
           and (:mercado = '' or o.mercado = :mercado)
           and (:usuario = '' or lower(o.usuario.nome) = lower(:usuario))
           and o.realizadaEm >= coalesce(:inicio, o.realizadaEm)
           and o.realizadaEm <= coalesce(:fim, o.realizadaEm)
           and (
                :busca = ''
                or lower(o.compraChave) like lower(concat('%', :busca, '%'))
                or lower(coalesce(o.mercado, '')) like lower(concat('%', :busca, '%'))
                or lower(coalesce(o.usuario.nome, '')) like lower(concat('%', :busca, '%'))
                or exists (
                    select x.id from ObservacaoPreco x
                     where x.compraChave = o.compraChave
                       and lower(x.nomeOriginal) like lower(concat('%', :busca, '%'))
                )
           )
        """)
    long contarCompras(
        @Param("busca") String busca,
        @Param("mercado") String mercado,
        @Param("usuario") String usuario,
        @Param("inicio") Instant inicio,
        @Param("fim") Instant fim
    );

    @Query("select distinct o.usuario.nome from ObservacaoPreco o where o.origem = br.com.minhalista.preco.OrigemPreco.COMPRA_USUARIO and o.usuario is not null order by o.usuario.nome")
    List<String> listarUsuariosCompras();

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

    interface ResumoCompras {
        long getTotalCompras();
        long getTotalItens();
        long getTotalUsuarios();
        long getTotalMercados();
        BigDecimal getValorTotal();
    }

    interface CompraAgregada {
        String getCompraId();
        UUID getUsuarioId();
        String getUsuarioNome();
        String getMercado();
        String getCidade();
        String getEstado();
        Instant getRealizadaEm();
        long getTotalItens();
        BigDecimal getValorTotal();
    }

    interface AnaliseAgrupada {
        String getNome();
        long getTotalObservacoes();
        Double getPrecoMedio();
    }
}
