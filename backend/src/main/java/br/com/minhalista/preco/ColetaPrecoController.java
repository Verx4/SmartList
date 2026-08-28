package br.com.minhalista.preco;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.minhalista.usuario.Usuario;
import br.com.minhalista.usuario.UsuarioService;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/coleta-precos")
public class ColetaPrecoController {

    private final ColetaPrecoService service;
    private final UsuarioService usuarioService;

    public ColetaPrecoController(ColetaPrecoService service, UsuarioService usuarioService) {
        this.service = service;
        this.usuarioService = usuarioService;
    }

    @PostMapping("/compras")
    public ColetaPrecoService.ResultadoColeta coletar(
        @Valid @RequestBody ColetaPrecoService.CompraRequest request
    ) {
        Usuario usuario = usuarioService.obterAutenticado();
        return service.coletar(usuario, request);
    }

    @GetMapping("/compras/historico")
    public List<ColetaPrecoService.HistoricoCompraResponse> historico() {
        Usuario usuario = usuarioService.obterAutenticado();
        usuarioService.exigirPremium(usuario);
        return service.historico(usuario);
    }
}
