package br.com.minhalista.preco;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import br.com.minhalista.usuario.Usuario;

@ExtendWith(MockitoExtension.class)
class ColetaPrecoServiceTest {

    @Mock
    private ProdutoPrecoRepository produtoRepository;

    @Mock
    private ObservacaoPrecoRepository observacaoRepository;

    @Test
    void deveColetarCompraUmaUnicaVezSemIdentidadeDoUsuario() {
        ColetaPrecoService service = new ColetaPrecoService(produtoRepository, observacaoRepository);
        Usuario usuario = new Usuario();
        usuario.setCidade("Recife");
        usuario.setEstado("pe");
        var request = new ColetaPrecoService.CompraRequest(
            "compra-1",
            Instant.parse("2026-08-27T15:00:00Z"),
            "Mercado Central",
            null,
            null,
            List.of(new ColetaPrecoService.ItemRequest(
                "item-1", "Arroz Branco", "🌾 Grãos", new BigDecimal("2"),
                "unidade", new BigDecimal("5.50"), new BigDecimal("11.00")
            ))
        );

        when(produtoRepository.findByNomeNormalizado(any())).thenReturn(Optional.empty());
        when(produtoRepository.save(any())).thenAnswer(invocacao -> invocacao.getArgument(0));
        when(observacaoRepository.existsByOrigemAndCompraChaveAndItemChave(any(), any(), any()))
            .thenReturn(false, true);

        assertEquals(1, service.coletar(usuario, request).criadas());
        assertEquals(1, service.coletar(usuario, request).ignoradas());
        verify(observacaoRepository, times(1)).save(any(ObservacaoPreco.class));

        ArgumentCaptor<ObservacaoPreco> captor = ArgumentCaptor.forClass(ObservacaoPreco.class);
        verify(observacaoRepository).save(captor.capture());
        ObservacaoPreco observacao = captor.getValue();
        assertEquals(OrigemPreco.COMPRA_USUARIO, observacao.getOrigem());
        assertEquals("Recife", observacao.getCidade());
        assertEquals("PE", observacao.getEstado());
        assertEquals("🌾 Grãos", observacao.getProduto().getCategoria());

        List<String> campos = Arrays.stream(ObservacaoPreco.class.getDeclaredFields())
            .map(Field::getName)
            .toList();
        assertFalse(campos.contains("usuario"));
        assertFalse(campos.contains("email"));
        assertFalse(campos.contains("nomeUsuario"));
    }

    @Test
    void deveUsarCategoriaDeterministicaEFallbackExistente() {
        ColetaPrecoService service = new ColetaPrecoService(produtoRepository, observacaoRepository);
        assertEquals("🧼 Limpeza", service.resolverCategoria("Detergente neutro", null));
        assertEquals("📦 Outros", service.resolverCategoria("Item desconhecido", null));
        assertEquals("🥛 Laticínios", service.resolverCategoria("Qualquer nome", "🥛 Laticínios"));
    }
}
