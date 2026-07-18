package br.com.minhalista.lista;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/listas")
public class ListaCompraController {

    private final ListaCompraService service;

    public ListaCompraController(ListaCompraService service) {
        this.service = service;
    }

    @GetMapping("/atual")
    public ListaCompraResponse obterAtual() {
        return service.obterAtual();
    }

    @PutMapping("/atual")
    public ListaCompraResponse atualizarAtual(@Valid @RequestBody AtualizarListaRequest request) {
        return service.atualizarAtual(request);
    }

    @PostMapping("/atual/itens")
    @ResponseStatus(HttpStatus.CREATED)
    public ListaCompraResponse adicionarItem(@Valid @RequestBody ItemListaRequest request) {
        return service.adicionarItem(request);
    }

    @PatchMapping("/atual/itens/{itemId}")
    public ListaCompraResponse atualizarItem(
        @PathVariable UUID itemId,
        @Valid @RequestBody ItemListaRequest request
    ) {
        return service.atualizarItem(itemId, request);
    }

    @DeleteMapping("/atual/itens/{itemId}")
    public ListaCompraResponse removerItem(@PathVariable UUID itemId) {
        return service.removerItem(itemId);
    }

    @PostMapping("/atual/finalizar")
    public ListaCompraResponse finalizar() {
        return service.finalizar();
    }

    @GetMapping("/historico")
    public List<ListaCompraResponse> historico() {
        return service.historico();
    }
}
