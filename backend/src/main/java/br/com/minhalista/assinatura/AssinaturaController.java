package br.com.minhalista.assinatura;

import java.util.List;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.minhalista.common.RegraNegocioException;
import br.com.minhalista.pagamento.CheckoutResponse;
import br.com.minhalista.pagamento.MercadoPagoService;
import br.com.minhalista.pagamento.PagamentoConsultado;
import br.com.minhalista.usuario.Usuario;
import br.com.minhalista.usuario.UsuarioService;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/assinaturas")
public class AssinaturaController {

    private static final Logger LOG = LoggerFactory.getLogger(AssinaturaController.class);
    private static final Pattern COLUNA_AUSENTE = Pattern.compile(
        "column\\s+([a-zA-Z0-9_.]+)\\s+does not exist",
        Pattern.CASE_INSENSITIVE
    );

    private final AssinaturaService assinaturaService;
    private final MercadoPagoService mercadoPagoService;
    private final UsuarioService usuarioService;

    public AssinaturaController(
        AssinaturaService assinaturaService,
        MercadoPagoService mercadoPagoService,
        UsuarioService usuarioService
    ) {
        this.assinaturaService = assinaturaService;
        this.mercadoPagoService = mercadoPagoService;
        this.usuarioService = usuarioService;
    }

    @GetMapping("/planos")
    public List<PlanoResponse> planos() {
        return assinaturaService.catalogo();
    }

    @GetMapping("/atual")
    public ResponseEntity<AssinaturaResponse> atual() {
        return assinaturaService.atual()
            .map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PostMapping("/confirmar-pagamento")
    public ConfirmarPagamentoResponse confirmarPagamento(
        @Valid @RequestBody ConfirmarPagamentoRequest request
    ) {
        Usuario usuario = usuarioService.obterAutenticado();
        PagamentoConsultado pagamento =
            mercadoPagoService.consultarPagamento(request.pagamentoId());

        if (!mercadoPagoService.ambienteCompativel(pagamento)) {
            throw new RegraNegocioException(
                HttpStatus.BAD_REQUEST,
                "O pagamento informado pertence a outro ambiente."
            );
        }

        boolean premiumAtivo = assinaturaService.confirmarPagamentoDoUsuario(
            pagamento,
            usuario.getId()
        );
        String status = pagamento.status() == null
            ? ""
            : pagamento.status().toLowerCase(Locale.ROOT);

        if ("approved".equals(status) && !premiumAtivo) {
            throw new RegraNegocioException(
                HttpStatus.BAD_REQUEST,
                "O pagamento aprovado não corresponde a este checkout ou usuário."
            );
        }

        String mensagem = premiumAtivo
            ? "Pagamento confirmado. Seu plano Premium já está ativo."
            : switch (status) {
                case "pending", "in_process", "in_mediation" ->
                    "Pagamento ainda pendente. O Premium será liberado automaticamente após a aprovação.";
                case "rejected", "cancelled" ->
                    "O pagamento não foi aprovado. Nenhuma assinatura foi ativada.";
                case "refunded", "charged_back" ->
                    "O pagamento foi devolvido ou contestado. A assinatura não está ativa.";
                default ->
                    "O pagamento ainda não foi aprovado pelo Mercado Pago.";
            };

        return new ConfirmarPagamentoResponse(
            premiumAtivo,
            status,
            mensagem
        );
    }

    @PostMapping("/checkout")
    public CheckoutResponse checkout(@Valid @RequestBody CheckoutRequest request) {
        String codigoDiagnostico = novoCodigoDiagnostico();
        Assinatura assinatura = null;

        try {
            Usuario usuario = usuarioService.obterAutenticado();
            LOG.info(
                "Checkout recebido: diagnostico={}, usuario={}, ciclo={}, cupom={}.",
                codigoDiagnostico,
                usuario.getId(),
                request.ciclo(),
                request.cupom() == null || request.cupom().isBlank()
                    ? "SEM_CUPOM"
                    : request.cupom().trim()
            );

            assinatura = assinaturaService.iniciarCheckout(
                usuario,
                request.ciclo(),
                request.cupom()
            );
            CheckoutResponse checkout =
                mercadoPagoService.criarPreferencia(usuario, assinatura);

            assinaturaService.vincularPreferencia(
                assinatura.getId(),
                checkout.preferenceId()
            );

            LOG.info(
                "Checkout preparado: diagnostico={}, checkout={}, preferencia={}.",
                codigoDiagnostico,
                assinatura.getId(),
                checkout.preferenceId()
            );
            return checkout;
        } catch (RegraNegocioException erro) {
            cancelarCheckoutPendente(assinatura, codigoDiagnostico);
            LOG.warn(
                "Checkout recusado: diagnostico={}, status={}, mensagem={}.",
                codigoDiagnostico,
                erro.getStatus().value(),
                erro.getMessage()
            );
            throw new RegraNegocioException(
                erro.getStatus(),
                erro.getMessage(),
                erro.getDetalhes(),
                codigoDiagnostico
            );
        } catch (RuntimeException erro) {
            cancelarCheckoutPendente(assinatura, codigoDiagnostico);
            LOG.error(
                "Falha inesperada no checkout. diagnostico={}, etapa={}.",
                codigoDiagnostico,
                assinatura == null ? "CRIAR_ASSINATURA" : "CRIAR_PREFERENCIA",
                erro
            );
            throw new RegraNegocioException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                mensagemFalhaCheckout(erro),
                detalhesExcecao(erro),
                codigoDiagnostico
            );
        }
    }

    private void cancelarCheckoutPendente(
        Assinatura assinatura,
        String codigoDiagnostico
    ) {
        if (assinatura == null || assinatura.getId() == null) {
            return;
        }

        try {
            assinaturaService.registrarFalhaCheckout(assinatura.getId());
        } catch (RuntimeException falhaRegistro) {
            LOG.error(
                "Não foi possível cancelar o checkout {} após a falha {}.",
                assinatura.getId(),
                codigoDiagnostico,
                falhaRegistro
            );
        }
    }

    private Map<String, Object> detalhesExcecao(RuntimeException erro) {
        Map<String, Object> detalhes = new LinkedHashMap<>();
        detalhes.put("exception", erro.getClass().getName());
        detalhes.put("message", String.valueOf(erro.getMessage()));

        if (erro.getCause() != null) {
            detalhes.put("cause", erro.getCause().getClass().getName());
            detalhes.put("causeMessage", String.valueOf(erro.getCause().getMessage()));
        }

        return detalhes;
    }

    String mensagemFalhaCheckout(RuntimeException erro) {
        Throwable causa = causaRaiz(erro);
        String mensagem = causa.getMessage();

        if (mensagem != null) {
            Matcher colunaAusente = COLUNA_AUSENTE.matcher(mensagem);

            if (colunaAusente.find()) {
                return "O banco de dados do checkout está desatualizado: falta a coluna "
                    + colunaAusente.group(1) + ".";
            }
        }

        return "Não foi possível preparar o pagamento.";
    }

    private Throwable causaRaiz(Throwable erro) {
        Throwable atual = erro;

        while (atual.getCause() != null && atual.getCause() != atual) {
            atual = atual.getCause();
        }

        return atual;
    }

    private String novoCodigoDiagnostico() {
        return UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    @PostMapping("/cupom/validar")
    public CupomAplicacaoResponse validarCupom(
        @Valid @RequestBody CupomValidacaoRequest request
    ) {
        return assinaturaService.validarCupom(request.codigo(), request.ciclo());
    }
}
