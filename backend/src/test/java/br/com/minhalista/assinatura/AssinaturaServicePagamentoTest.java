package br.com.minhalista.assinatura;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import br.com.minhalista.pagamento.PagamentoConsultado;
import br.com.minhalista.usuario.TipoAcesso;
import br.com.minhalista.usuario.Usuario;
import br.com.minhalista.usuario.UsuarioService;

@ExtendWith(MockitoExtension.class)
class AssinaturaServicePagamentoTest {

    @Mock
    private AssinaturaRepository repository;

    @Mock
    private UsuarioService usuarioService;

    private AssinaturaService service;
    private Assinatura assinatura;
    private Usuario usuario;
    private UUID assinaturaId;

    @BeforeEach
    void preparar() {
        service = new AssinaturaService(repository, usuarioService);
        assinaturaId = UUID.randomUUID();

        usuario = new Usuario();
        ReflectionTestUtils.setField(usuario, "id", UUID.randomUUID());
        usuario.setTipoAcesso(TipoAcesso.FREE);

        assinatura = new Assinatura();
        ReflectionTestUtils.setField(assinatura, "id", assinaturaId);
        assinatura.setUsuario(usuario);
        assinatura.setCiclo(CicloAssinatura.MENSAL);
        assinatura.setStatus(StatusAssinatura.PENDENTE);
        assinatura.setValor(new BigDecimal("9.97"));

        when(repository.buscarPorIdParaAtualizacao(assinaturaId))
            .thenReturn(Optional.of(assinatura));
    }

    @Test
    void ativaSomenteQuandoPagamentoConfere() {
        PagamentoConsultado pagamento = pagamento(new BigDecimal("9.97"), "BRL");

        when(repository.findByMercadoPagoPagamentoId("123456"))
            .thenReturn(Optional.empty());
        when(usuarioService.obterPorIdParaAtualizacao(usuario.getId()))
            .thenReturn(usuario);
        when(repository.findFirstByUsuarioIdAndStatusOrderByVenceEmDesc(
            usuario.getId(),
            StatusAssinatura.ATIVA
        )).thenReturn(Optional.empty());

        service.processarPagamento(pagamento);

        assertEquals(StatusAssinatura.ATIVA, assinatura.getStatus());
        assertEquals("123456", assinatura.getMercadoPagoPagamentoId());
        assertEquals(TipoAcesso.PREMIUM, usuario.getTipoAcesso());
    }

    @Test
    void ignoraPagamentoComValorDivergente() {
        PagamentoConsultado pagamento = pagamento(new BigDecimal("0.01"), "BRL");

        service.processarPagamento(pagamento);

        assertEquals(StatusAssinatura.PENDENTE, assinatura.getStatus());
        assertEquals(TipoAcesso.FREE, usuario.getTipoAcesso());
        verify(repository, never()).findByMercadoPagoPagamentoId("123456");
    }

    @Test
    void ignoraPagamentoComMoedaDivergente() {
        PagamentoConsultado pagamento = pagamento(new BigDecimal("9.97"), "USD");

        service.processarPagamento(pagamento);

        assertEquals(StatusAssinatura.PENDENTE, assinatura.getStatus());
        assertEquals(TipoAcesso.FREE, usuario.getTipoAcesso());
        verify(repository, never()).findByMercadoPagoPagamentoId("123456");
    }

    private PagamentoConsultado pagamento(BigDecimal valor, String moeda) {
        return new PagamentoConsultado(
            "123456",
            "approved",
            assinaturaId.toString(),
            assinaturaId.toString(),
            "MENSAL",
            valor,
            moeda,
            false
        );
    }
}
