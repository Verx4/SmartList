package br.com.minhalista.assinatura;

import java.util.List;
import java.util.Locale;

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
        Usuario usuario = usuarioService.obterAutenticado();
        Assinatura assinatura =
            assinaturaService.iniciarCheckout(usuario, request.ciclo());
        CheckoutResponse checkout;

        try {
            checkout = mercadoPagoService.criarPreferencia(usuario, assinatura);
        } catch (RuntimeException erro) {
            assinaturaService.registrarFalhaCheckout(assinatura.getId());
            throw erro;
        }

        assinaturaService.vincularPreferencia(
            assinatura.getId(),
            checkout.preferenceId()
        );

        return checkout;
    }
}
