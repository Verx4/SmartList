package br.com.minhalista.scraper;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import br.com.minhalista.usuario.Usuario;
import br.com.minhalista.usuario.UsuarioService;

@RestController
@RequestMapping("/api/precos")
public class PrecoController {

    private final ScraperService scraperService;
    private final UsuarioService usuarioService;

    public PrecoController(ScraperService scraperService, UsuarioService usuarioService) {
        this.scraperService = scraperService;
        this.usuarioService = usuarioService;
    }

    @GetMapping
    public List<PrecoColetadoResponse> pesquisar(@RequestParam String produto) {
        Usuario usuario = usuarioService.obterAutenticado();
        usuarioService.exigirPremium(usuario);
        return scraperService.pesquisar(produto);
    }
}
