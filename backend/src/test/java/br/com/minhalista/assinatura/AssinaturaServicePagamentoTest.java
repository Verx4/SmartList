package br.com.minhalista.assinatura;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Instant;
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

    @Mock
    private AssinaturaValidadeService validadeService;

    @Mock
    private PlanoService planoService;

    @Mock
    private CupomService cupomService;

    private AssinaturaService service;
    private Assinatura assinatura;
    private Usuario usuario;
    private UUID assinaturaId;

    @BeforeEach
    void preparar() {
        service = new AssinaturaService(
            repository,
            usuarioService,
            validadeService,
            planoService,
            cupomService
        );
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
        when(repository.findFirstByUsuarioIdAndStatusAndVenceEmAfterOrderByVenceEmDesc(
            eq(usuario.getId()),
            eq(StatusAssinatura.ATIVA),
            any()
        )).thenReturn(Optional.empty());

        boolean confirmado = service.confirmarPagamentoDoUsuario(
            pagamento,
            usuario.getId()
        );

        assertTrue(confirmado);
        assertEquals(StatusAssinatura.ATIVA, assinatura.getStatus());
        assertEquals("123456", assinatura.getMercadoPagoPagamentoId());
        assertEquals(TipoAcesso.PREMIUM, usuario.getTipoAcesso());
    }

    @Test
    void registraQueDescontoFoiUsadoQuandoPrimeiroPagamentoEConfirmado() {
        assinatura.setValor(new BigDecimal("9.47"));
        assinatura.setCupomCodigo("CLUBE5");
        assinatura.setCupomPrimeiraCobrancaSomente(true);
        PagamentoConsultado pagamento = pagamento(new BigDecimal("9.47"), "BRL");

        when(repository.findByMercadoPagoPagamentoId("123456"))
            .thenReturn(Optional.empty());
        when(repository.findFirstByUsuarioIdAndStatusAndVenceEmAfterOrderByVenceEmDesc(
            eq(usuario.getId()),
            eq(StatusAssinatura.ATIVA),
            any()
        )).thenReturn(Optional.empty());

        assertTrue(service.confirmarPagamentoDoUsuario(pagamento, usuario.getId()));
        assertTrue(assinatura.isCupomPrimeiroPagamentoAplicado());
    }

    @Test
    void confirmacaoRepetidaRestauraAcessoPremium() {
        PagamentoConsultado pagamento =
            pagamento(new BigDecimal("9.97"), "BRL");
        assinatura.setStatus(StatusAssinatura.ATIVA);
        assinatura.setMercadoPagoPagamentoId("123456");
        assinatura.setVenceEm(Instant.now().plusSeconds(3600));
        usuario.setTipoAcesso(TipoAcesso.FREE);

        when(repository.findByMercadoPagoPagamentoId("123456"))
            .thenReturn(Optional.of(assinatura));

        boolean confirmado = service.confirmarPagamentoDoUsuario(
            pagamento,
            usuario.getId()
        );

        assertTrue(confirmado);
        assertEquals(TipoAcesso.PREMIUM, usuario.getTipoAcesso());
    }

    @Test
    void recusaConfirmacaoDePagamentoDeOutroUsuario() {
        PagamentoConsultado pagamento =
            pagamento(new BigDecimal("9.97"), "BRL");

        boolean confirmado = service.confirmarPagamentoDoUsuario(
            pagamento,
            UUID.randomUUID()
        );

        assertFalse(confirmado);
        assertEquals(StatusAssinatura.PENDENTE, assinatura.getStatus());
        assertEquals(TipoAcesso.FREE, usuario.getTipoAcesso());
        verify(repository, never()).findByMercadoPagoPagamentoId("123456");
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
