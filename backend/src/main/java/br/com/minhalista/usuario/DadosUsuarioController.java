package br.com.minhalista.usuario;

import java.time.Instant;
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
import br.com.minhalista.lista.StatusLista;

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

        // Este marco impede que qualquer cópia histórica anterior volte a ser
        // exibida no Início ou no Histórico do próprio usuário.
        usuario.setDadosComprasLimposEm(Instant.now());

        List<ListaCompra> listas = listaRepository.findAllByUsuarioId(usuarioId);

        // Compras finalizadas deixam de aparecer somente para o usuário.
        // Elas permanecem no banco para alimentar a Coleta de Preços do ADM.
        listas.stream()
            .filter(lista -> lista.getStatus() == StatusLista.FINALIZADA)
            .forEach(lista -> lista.setOcultaParaUsuario(true));

        // Listas abertas ainda podem ser removidas definitivamente, pois não
        // representam compras concluídas nem dados históricos administrativos.
        List<ListaCompra> abertas = listas.stream()
            .filter(lista -> lista.getStatus() == StatusLista.ABERTA)
            .toList();

        if (!abertas.isEmpty()) {
            listaRepository.deleteAll(abertas);
        }
    }
}
