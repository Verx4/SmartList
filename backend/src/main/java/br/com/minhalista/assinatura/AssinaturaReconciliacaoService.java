package br.com.minhalista.assinatura;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import br.com.minhalista.pagamento.KiwifyApiService;
import br.com.minhalista.pagamento.MercadoPagoService;
import br.com.minhalista.pagamento.PagamentoConsultado;
import br.com.minhalista.usuario.Usuario;

@Service
public class AssinaturaReconciliacaoService {

    private static final Logger LOG =
        LoggerFactory.getLogger(AssinaturaReconciliacaoService.class);

    private final AssinaturaRepository repository;
    private final MercadoPagoService mercadoPagoService;
    private final KiwifyApiService kiwifyApiService;
    private final AssinaturaService assinaturaService;

    public AssinaturaReconciliacaoService(
        AssinaturaRepository repository,
        MercadoPagoService mercadoPagoService,
        KiwifyApiService kiwifyApiService,
        AssinaturaService assinaturaService
    ) {
        this.repository = repository;
        this.mercadoPagoService = mercadoPagoService;
        this.kiwifyApiService = kiwifyApiService;
        this.assinaturaService = assinaturaService;
    }

    public void reconciliarUsuario(Usuario usuario) {
        if (usuario == null || usuario.getId() == null) {
            return;
        }

        List<Assinatura> pendentes = repository
            .findTop5ByUsuarioIdAndStatusAndMercadoPagoPreferenciaIdIsNotNullOrderByCriadoEmDesc(
                usuario.getId(),
                StatusAssinatura.PENDENTE
            );

        pendentes.forEach(this::reconciliar);
    }

    @Scheduled(cron = "20 */5 * * * *", zone = "America/Fortaleza")
    public void reconciliarPendentesRecentes() {
        Instant limite = Instant.now().minus(Duration.ofDays(30));
        List<Assinatura> pendentes = repository
            .findTop20ByStatusAndMercadoPagoPreferenciaIdIsNotNullAndCriadoEmAfterOrderByCriadoEmAsc(
                StatusAssinatura.PENDENTE,
                limite
            );

        pendentes.forEach(this::reconciliar);
        reconciliarVendasKiwify(limite, Instant.now());
    }

    private void reconciliarVendasKiwify(Instant inicio, Instant fim) {
        try {
            List<Map<String, Object>> vendas =
                kiwifyApiService.listarVendasPagasRecentes(inicio, fim);

            for (Map<String, Object> venda : vendas) {
                boolean ativado = assinaturaService.processarVendaKiwify(
                    venda,
                    "reconciliation"
                );

                if (ativado) {
                    LOG.info(
                        "Venda Kiwify {} reconciliada; assinatura Premium confirmada.",
                        venda.get("id")
                    );
                }
            }
        } catch (RuntimeException erro) {
            LOG.warn(
                "Não foi possível reconciliar vendas Kiwify: {}.",
                erro.getClass().getSimpleName()
            );
        }
    }

    private void reconciliar(Assinatura assinatura) {
        try {
            PagamentoConsultado pagamento = mercadoPagoService
                .buscarPagamentoAprovadoPorReferencia(assinatura.getId())
                .orElse(null);

            if (pagamento == null || !mercadoPagoService.ambienteCompativel(pagamento)) {
                return;
            }

            boolean ativado = assinaturaService.confirmarPagamentoDoUsuario(
                pagamento,
                assinatura.getUsuario().getId()
            );

            if (ativado) {
                LOG.info(
                    "Checkout {} reconciliado e assinatura Premium ativada.",
                    assinatura.getId()
                );
            }
        } catch (RuntimeException erro) {
            LOG.warn(
                "Não foi possível reconciliar automaticamente o checkout {}: {}.",
                assinatura.getId(),
                erro.getClass().getSimpleName()
            );
        }
    }
}
