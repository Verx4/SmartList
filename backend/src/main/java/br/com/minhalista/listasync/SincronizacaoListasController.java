package br.com.minhalista.listasync;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/listas/sincronizacao")
public class SincronizacaoListasController {

    private final SincronizacaoListasService service;

    public SincronizacaoListasController(SincronizacaoListasService service) {
        this.service = service;
    }

    @GetMapping
    public EstadoListasResponse consultar() {
        return service.consultar();
    }

    @PutMapping
    public EstadoListasResponse salvar(
        @Valid @RequestBody AtualizarEstadoListasRequest request
    ) {
        return service.salvar(request);
    }
}
