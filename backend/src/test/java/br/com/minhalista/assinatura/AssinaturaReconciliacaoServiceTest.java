package br.com.minhalista.assinatura;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import br.com.minhalista.pagamento.KiwifyApiService;
import br.com.minhalista.pagamento.MercadoPagoService;
import br.com.minhalista.pagamento.PagamentoConsultado;
import br.com.minhalista.usuario.Usuario;

@ExtendWith(MockitoExtension.class)
class AssinaturaReconciliacaoServiceTest {

    @Mock
    private AssinaturaRepository repository;

    @Mock
    private MercadoPagoService mercadoPagoService;

    @Mock
    private KiwifyApiService kiwifyApiService;

    @Mock
    private AssinaturaService assinaturaService;

    private AssinaturaReconciliacaoService service;
    private Usuario usuario;
    private Assinatura assinatura;
    private UUID assinaturaId;

    @BeforeEach
    void preparar() {
        service = new AssinaturaReconciliacaoService(
            repository,
            mercadoPagoService,
            kiwifyApiService,
            assinaturaService
        );
        usuario = new Usuario();
        ReflectionTestUtils.setField(usuario, "id", UUID.randomUUID());
        assinaturaId = UUID.randomUUID();
        assinatura = new Assinatura();
        ReflectionTestUtils.setField(assinatura, "id", assinaturaId);
        assinatura.setUsuario(usuario);
    }

    @Test
    void ativaPagamentoAprovadoDeCheckoutPendenteDoUsuario() {
        PagamentoConsultado pagamento = new PagamentoConsultado(
            "123456",
            "approved",
            assinaturaId.toString(),
            null,
            null,
            new BigDecimal("9.97"),
            "BRL",
            false
        );

        when(repository
            .findTop5ByUsuarioIdAndStatusAndMercadoPagoPreferenciaIdIsNotNullOrderByCriadoEmDesc(
                usuario.getId(),
                StatusAssinatura.PENDENTE
            )).thenReturn(List.of(assinatura));
        when(mercadoPagoService.buscarPagamentoAprovadoPorReferencia(assinaturaId))
            .thenReturn(Optional.of(pagamento));
        when(mercadoPagoService.ambienteCompativel(pagamento)).thenReturn(true);
        when(assinaturaService.confirmarPagamentoDoUsuario(
            pagamento,
            usuario.getId()
        )).thenReturn(true);

        service.reconciliarUsuario(usuario);

        verify(assinaturaService).confirmarPagamentoDoUsuario(
            pagamento,
            usuario.getId()
        );
    }
}
