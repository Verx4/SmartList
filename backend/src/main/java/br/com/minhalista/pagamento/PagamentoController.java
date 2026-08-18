package br.com.minhalista.pagamento;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.minhalista.usuario.Usuario;
import br.com.minhalista.usuario.UsuarioService;
import jakarta.validation.Valid;

@RestController
@RequestMapping({"/api/payments", "/api/pagamentos"})
public class PagamentoController {

    private final PagamentoPixService pagamentoPixService;
    private final UsuarioService usuarioService;

    public PagamentoController(
        PagamentoPixService pagamentoPixService,
        UsuarioService usuarioService
    ) {
        this.pagamentoPixService = pagamentoPixService;
        this.usuarioService = usuarioService;
    }

    @PostMapping("/pix")
    public PixPagamentoResponse criarPix(
        @Valid @RequestBody PixCheckoutRequest request
    ) {
        Usuario usuario = usuarioService.obterAutenticado();
        return pagamentoPixService.criar(usuario, request.planId(), request.cpf());
    }

    @GetMapping("/{paymentId}/status")
    public PixPagamentoResponse consultarStatus(
        @PathVariable UUID paymentId
    ) {
        Usuario usuario = usuarioService.obterAutenticado();
        return pagamentoPixService.consultar(usuario, paymentId);
    }

    @GetMapping("/pix/pending")
    public ResponseEntity<PixPagamentoResponse> pixPendente() {
        Usuario usuario = usuarioService.obterAutenticado();
        return pagamentoPixService.pendente(usuario)
            .map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.noContent().build());
    }
}

