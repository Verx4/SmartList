package br.com.minhalista.receita;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.validation.annotation.Validated;

import br.com.minhalista.lista.ListaCompraResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;

@RestController
@RequestMapping("/api/receitas")
@Validated
public class ReceitaController {

    private final ReceitaService service;
    private final CatalogoReceitasService catalogoService;

    public ReceitaController(ReceitaService service, CatalogoReceitasService catalogoService) {
        this.service = service;
        this.catalogoService = catalogoService;
    }

    @GetMapping
    public List<ReceitaResponse> buscar(
        @RequestParam(required = false) String busca,
        @RequestParam(required = false) String ingredientes,
        @RequestParam(required = false) String categoria,
        @RequestParam(required = false) String tipo,
        @RequestParam(required = false) String tempo,
        @RequestParam(defaultValue = "false") boolean somenteDisponiveis
    ) {
        return service.buscar(busca, ingredientes, categoria, tipo, tempo, somenteDisponiveis);
    }

    @GetMapping("/catalogo")
    public List<ReceitaResponse> buscarCatalogo(
        @RequestParam @Size(max = 100) String busca
    ) {
        return catalogoService.buscarEImportar(busca).stream().map(service::obter).toList();
    }

    @PostMapping("/gerar")
    @ResponseStatus(HttpStatus.CREATED)
    public ReceitaResponse gerar(@Valid @RequestBody GerarReceitaRequest request) {
        String id = catalogoService.gerarEImportar(request.busca(), request.despensa());
        return service.obter(id);
    }

    @GetMapping("/favoritas")
    public List<ReceitaResponse> favoritas() {
        return service.favoritas();
    }

    @GetMapping("/historico")
    public List<HistoricoReceitaResponse> historico() {
        return service.historico();
    }

    @GetMapping("/{id}")
    public ReceitaResponse obter(@PathVariable String id) {
        return service.obter(id);
    }

    @PostMapping("/{id}/favorito")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void favoritar(@PathVariable String id) {
        service.favoritar(id);
    }

    @DeleteMapping("/{id}/favorito")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void desfavoritar(@PathVariable String id) {
        service.desfavoritar(id);
    }

    @PostMapping("/{id}/faltantes/lista")
    public ListaCompraResponse adicionarFaltantesALista(@PathVariable String id) {
        return service.adicionarFaltantesALista(id);
    }

    @PostMapping("/{id}/finalizar")
    public HistoricoReceitaResponse finalizar(
        @PathVariable String id,
        @RequestBody FinalizarReceitaRequest request
    ) {
        return service.finalizar(id, request.atualizarDespensa());
    }
}
