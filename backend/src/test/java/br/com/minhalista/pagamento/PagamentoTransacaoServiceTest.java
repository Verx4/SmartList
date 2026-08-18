package br.com.minhalista.pagamento;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
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

import br.com.minhalista.assinatura.Assinatura;
import br.com.minhalista.assinatura.AssinaturaService;
import br.com.minhalista.assinatura.CicloAssinatura;
import br.com.minhalista.assinatura.StatusAssinatura;
import br.com.minhalista.common.RegraNegocioException;
import br.com.minhalista.usuario.TipoAcesso;
import br.com.minhalista.usuario.Usuario;
import br.com.minhalista.usuario.UsuarioRepository;

@ExtendWith(MockitoExtension.class)
class PagamentoTransacaoServiceTest {

    @Mock
    private PagamentoRepository pagamentoRepository;

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private AssinaturaService assinaturaService;

    private PagamentoTransacaoService service;
    private Usuario usuario;
    private Assinatura assinatura;
    private Pagamento pagamento;

    @BeforeEach
    void preparar() {
        service = new PagamentoTransacaoService(
            pagamentoRepository,
            usuarioRepository,
            assinaturaService
        );

        usuario = new Usuario();
        ReflectionTestUtils.setField(usuario, "id", UUID.randomUUID());
        usuario.setEmail("cliente@example.com");
        usuario.setTipoAcesso(TipoAcesso.FREE);

        assinatura = new Assinatura();
        ReflectionTestUtils.setField(assinatura, "id", UUID.randomUUID());
        assinatura.setUsuario(usuario);
        assinatura.setCiclo(CicloAssinatura.ANUAL);
        assinatura.setStatus(StatusAssinatura.PENDENTE);
        assinatura.setValor(CicloAssinatura.ANUAL.getValor());

        pagamento = novoPagamento();
    }

    @Test
    void ignoraValorEnviadoPeloNavegadorEUsaCatalogoDoBackend() {
        when(usuarioRepository.buscarPorIdParaAtualizacao(usuario.getId()))
            .thenReturn(Optional.of(usuario));
        when(pagamentoRepository
            .findFirstByUsuarioIdAndPlanIdAndPaymentMethodAndStatusInOrderByCreatedAtDesc(
                any(), any(), any(), any()
            )).thenReturn(Optional.empty());
        when(assinaturaService.iniciarCheckout(usuario, CicloAssinatura.ANUAL))
            .thenReturn(assinatura);
        when(pagamentoRepository.saveAndFlush(any(Pagamento.class)))
            .thenAnswer(invocacao -> invocacao.getArgument(0));

        Pagamento criado = service.preparar(usuario.getId(), CicloAssinatura.ANUAL);

        assertEquals(new BigDecimal("95.64"), criado.getAmount());
        assertEquals("premium_yearly", criado.getPlanId());
        assertEquals("BRL", criado.getCurrency());
    }

    @Test
    void webhookComValorAlteradoNaoAtivaPremium() {
        configurarBuscaComLock();
        PagamentoConsultado consultado = pagamentoConsultado(
            "approved",
            new BigDecimal("0.01")
        );

        assertTrue(service.processarSePix(consultado));
        assertFalse(pagamento.isBenefitGranted());
        assertEquals(StatusPagamento.PENDING, pagamento.getStatus());
        verify(assinaturaService, never()).ativarPremium(any(), any());
    }

    @Test
    void webhookDuplicadoConcedeBeneficioUmaUnicaVez() {
        configurarBuscaComLock();
        PagamentoConsultado consultado = pagamentoConsultado(
            "approved",
            new BigDecimal("95.64")
        );
        when(assinaturaService.ativarPremium(assinatura.getId(), "987654"))
            .thenReturn(assinatura);

        assertTrue(service.processarSePix(consultado));
        assertTrue(service.processarSePix(consultado));

        assertTrue(pagamento.isBenefitGranted());
        assertEquals(StatusPagamento.APPROVED, pagamento.getStatus());
        verify(assinaturaService, times(1))
            .ativarPremium(assinatura.getId(), "987654");
    }

    @Test
    void pixPendenteNaoAtivaPremium() {
        configurarBuscaComLock();

        assertTrue(service.processarSePix(pagamentoConsultado(
            "pending",
            new BigDecimal("95.64")
        )));

        assertFalse(pagamento.isBenefitGranted());
        assertEquals(StatusPagamento.PENDING, pagamento.getStatus());
        verify(assinaturaService, never()).ativarPremium(any(), any());
    }

    @Test
    void cliqueDuploReutilizaCobrancaPendenteDoMesmoPlano() {
        when(usuarioRepository.buscarPorIdParaAtualizacao(usuario.getId()))
            .thenReturn(Optional.of(usuario));
        when(pagamentoRepository
            .findFirstByUsuarioIdAndPlanIdAndPaymentMethodAndStatusInOrderByCreatedAtDesc(
                usuario.getId(),
                "premium_yearly",
                FormaPagamento.PIX,
                java.util.Set.of(StatusPagamento.CREATED, StatusPagamento.PENDING)
            )).thenReturn(Optional.of(pagamento));

        Pagamento reutilizado = service.preparar(
            usuario.getId(),
            CicloAssinatura.ANUAL
        );

        assertSame(pagamento, reutilizado);
        verify(assinaturaService, never()).iniciarCheckout(any(), any());
        verify(pagamentoRepository, never()).saveAndFlush(any());
    }

    @Test
    void usuarioNaoConsultaPagamentoDeOutraPessoa() {
        UUID outroUsuario = UUID.randomUUID();
        when(pagamentoRepository.findByPublicIdAndUsuarioId(
            pagamento.getPublicId(),
            outroUsuario
        )).thenReturn(Optional.empty());

        assertThrows(
            RegraNegocioException.class,
            () -> service.obterDoUsuario(pagamento.getPublicId(), outroUsuario)
        );
    }

    @Test
    void statusSemAprovacaoNuncaConcedePremium() {
        configurarBuscaComLock();

        for (String status : java.util.List.of(
            "created",
            "pending",
            "rejected",
            "cancelled",
            "expired"
        )) {
            pagamento.setStatus(StatusPagamento.PENDING);
            pagamento.setBenefitGranted(false);

            assertTrue(service.processarSePix(pagamentoConsultado(
                status,
                new BigDecimal("95.64")
            )));
            assertFalse(pagamento.isBenefitGranted());
        }

        verify(assinaturaService, never()).ativarPremium(any(), any());
    }

    @Test
    void reembolsoRevogaAssinaturaSemConcederNovoBeneficio() {
        configurarBuscaComLock();

        assertTrue(service.processarSePix(pagamentoConsultado(
            "refunded",
            new BigDecimal("95.64")
        )));

        assertEquals(StatusPagamento.REFUNDED, pagamento.getStatus());
        assertFalse(pagamento.isBenefitGranted());
        verify(assinaturaService).cancelarPagamento(
            assinatura.getId(),
            "987654"
        );
        verify(assinaturaService, never()).ativarPremium(any(), any());
    }

    private Pagamento novoPagamento() {
        Pagamento novo = new Pagamento();
        ReflectionTestUtils.setField(novo, "id", UUID.randomUUID());
        novo.setPublicId(UUID.randomUUID());
        novo.setIdempotencyKey(UUID.randomUUID());
        novo.setUsuario(usuario);
        novo.setAssinatura(assinatura);
        novo.setProvider("mercado_pago");
        novo.setProviderPaymentId("987654");
        novo.setExternalReference(assinatura.getId().toString());
        novo.setPlanId("premium_yearly");
        novo.setAmount(new BigDecimal("95.64"));
        novo.setCurrency("BRL");
        novo.setPaymentMethod(FormaPagamento.PIX);
        novo.setStatus(StatusPagamento.PENDING);
        novo.setExpiresAt(Instant.now().plusSeconds(1800));
        return novo;
    }

    private void configurarBuscaComLock() {
        when(pagamentoRepository.findByProviderPaymentId("987654"))
            .thenReturn(Optional.of(pagamento));
        when(pagamentoRepository.buscarPorIdParaAtualizacao(pagamento.getId()))
            .thenReturn(Optional.of(pagamento));
    }

    private PagamentoConsultado pagamentoConsultado(
        String status,
        BigDecimal valor
    ) {
        return new PagamentoConsultado(
            "987654",
            status,
            pagamento.getExternalReference(),
            assinatura.getId().toString(),
            assinatura.getCiclo().name(),
            usuario.getId().toString(),
            pagamento.getPlanId(),
            pagamento.getPublicId().toString(),
            valor,
            "BRL",
            "pix",
            false,
            Instant.now(),
            pagamento.getExpiresAt()
        );
    }
}
