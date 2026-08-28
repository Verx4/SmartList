package br.com.minhalista.preco;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.math.BigDecimal;
import java.time.Instant;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;

import br.com.minhalista.usuario.Usuario;
import br.com.minhalista.usuario.UsuarioRepository;

@DataJpaTest
class AdminPrecoHistoricoIntegrationTest {

    @Autowired
    private ProdutoPrecoRepository produtoRepository;

    @Autowired
    private ObservacaoPrecoRepository observacaoRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Test
    void deveExibirNoAdmAMesmaCompraRegistradaParaOUsuario() {
        Usuario usuario = new Usuario();
        usuario.setNome("Fernando");
        usuario.setEmail("fernando-historico@smartlist.test");
        usuario.setSenhaHash("senha-hash-de-teste");
        usuario = usuarioRepository.saveAndFlush(usuario);

        ProdutoPreco produto = new ProdutoPreco();
        produto.setNomeExibicao("Tomate");
        produto.setNomeNormalizado("tomate");
        produto.setCategoria("🍎 Hortifruti");
        produto = produtoRepository.saveAndFlush(produto);

        ObservacaoPreco observacao = new ObservacaoPreco();
        observacao.setProduto(produto);
        observacao.setUsuario(usuario);
        observacao.setNomeOriginal("Tomate");
        observacao.setQuantidade(new BigDecimal("1.500"));
        observacao.setUnidade("kg");
        observacao.setPrecoUnitario(new BigDecimal("7.9900"));
        observacao.setSubtotal(new BigDecimal("11.99"));
        observacao.setEconomiaCompra(new BigDecimal("2.50"));
        observacao.setMercado("Assaí");
        observacao.setRealizadaEm(Instant.parse("2026-08-28T12:00:00Z"));
        observacao.setOrigem(OrigemPreco.COMPRA_USUARIO);
        observacao.setCompraChave("compra-compartilhada");
        observacao.setItemChave("item-tomate");
        observacaoRepository.saveAndFlush(observacao);

        AdminPrecoService service = new AdminPrecoService(produtoRepository, observacaoRepository);
        AdminPrecoService.PaginaResponse<AdminPrecoService.CompraResumoResponse> pagina =
            service.compras("", "", "", null, null, 0, 20);

        assertEquals(1, pagina.totalElementos());
        assertEquals(1, pagina.conteudo().size());
        assertEquals("compra-compartilhada", pagina.conteudo().get(0).compraId());
        assertEquals("Fernando", pagina.conteudo().get(0).usuarioNome());
        assertEquals("Assaí", pagina.conteudo().get(0).mercado());
        assertEquals(new BigDecimal("11.99"), pagina.conteudo().get(0).valorTotal());
    }
}
