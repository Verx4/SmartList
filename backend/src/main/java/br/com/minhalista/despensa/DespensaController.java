package br.com.minhalista.despensa;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/despensa")
public class DespensaController {

    private final DespensaService service;

    public DespensaController(DespensaService service) {
        this.service = service;
    }

    @GetMapping
    public List<ItemDespensaResponse> listar() {
        return service.listar();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ItemDespensaResponse adicionar(@Valid @RequestBody ItemDespensaRequest request) {
        return service.adicionar(request);
    }

    @PatchMapping("/{id}")
    public ItemDespensaResponse atualizar(@PathVariable UUID id, @Valid @RequestBody ItemDespensaRequest request) {
        return service.atualizar(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remover(@PathVariable UUID id) {
        service.remover(id);
    }

    @PostMapping("/compras")
    public List<ItemDespensaResponse> adicionarCompra(@Valid @RequestBody CompraDespensaRequest request) {
        return service.adicionarCompra(request);
    }
}
