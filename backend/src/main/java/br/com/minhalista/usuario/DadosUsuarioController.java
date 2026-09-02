package br.com.minhalista.usuario;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.com.minhalista.lista.ListaCompra;
import br.com.minhalista.lista.ListaCompraRepository;

@RestController
@RequestMapping("/api/usuario")
public class DadosUsuarioController {

    private final UsuarioService usuarioService;
    private final ListaCompraRepository listaRepository;

    public DadosUsuarioController(
        UsuarioService usuarioService,
        ListaCompraRepository listaRepository
    ) {
        this.usuarioService = usuarioService;
        this.listaRepository = listaRepository;
    }

    @DeleteMapping("/dados")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void limparDadosDeCompras() {
        Usuario usuario = usuarioService.obterAutenticado();
        UUID usuarioId = usuario.getId();
        // As observações históricas de preços são preservadas.
        // Elas alimentam a Coleta de Preços do painel administrativo e são
        // independentes da lista e do histórico pessoal exibidos ao usuário.

        // Remove definitivamente listas abertas e finalizadas do próprio usuário.
        // O relacionamento ListaCompra -> ItemLista usa cascade + orphanRemoval.
        List<ListaCompra> listas = listaRepository.findAllByUsuarioId(usuarioId);
        if (!listas.isEmpty()) {
            listaRepository.deleteAll(listas);
        }
    }
}
