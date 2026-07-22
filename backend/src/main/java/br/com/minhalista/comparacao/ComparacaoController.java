package br.com.minhalista.comparacao;

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
@RequestMapping("/api/comparacoes")
public class ComparacaoController {

    private final ComparacaoService comparacaoService;
    private final UsuarioService usuarioService;

    public ComparacaoController(
        ComparacaoService comparacaoService,
        UsuarioService usuarioService
    ) {
        this.comparacaoService = comparacaoService;
        this.usuarioService = usuarioService;
    }

    @GetMapping("/redes")
    public List<RedeMercadoResponse> redes() {
        exigirPremium();
        return comparacaoService.redes();
    }

    @PostMapping("/lista")
    public ComparacaoListaResponse compararLista(@Valid @RequestBody ComparacaoListaRequest request) {
        exigirPremium();
        return comparacaoService.comparar(request);
    }

    private void exigirPremium() {
        Usuario usuario = usuarioService.obterAutenticado();
        usuarioService.exigirPremium(usuario);
    }
}
