package br.com.minhalista.mercado;

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
@RequestMapping("/api/mercados")
public class MercadoController {

    private final MercadoService service;

    public MercadoController(MercadoService service) {
        this.service = service;
    }

    @GetMapping
    public List<MercadoResponse> listar() {
        return service.listar();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MercadoResponse adicionar(@Valid @RequestBody MercadoRequest request) {
        return service.adicionar(request);
    }

    @PutMapping("/{id}")
    public MercadoResponse atualizar(
        @PathVariable UUID id,
        @Valid @RequestBody MercadoRequest request
    ) {
        return service.atualizar(id, request);
    }

    @PatchMapping("/{id}/favorito")
    public MercadoResponse favoritar(
        @PathVariable UUID id,
        @Valid @RequestBody FavoritoRequest request
    ) {
        return service.favoritar(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remover(@PathVariable UUID id) {
        service.remover(id);
    }
}
