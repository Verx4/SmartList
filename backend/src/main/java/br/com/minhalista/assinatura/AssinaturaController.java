package br.com.minhalista.assinatura;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.minhalista.pagamento.CheckoutResponse;
import br.com.minhalista.pagamento.MercadoPagoService;
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
