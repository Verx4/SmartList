package br.com.minhalista.sugestao;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
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
@RequestMapping("/api/sugestoes")
public class SugestaoController {

    private final SugestaoService service;

    public SugestaoController(SugestaoService service) {
        this.service = service;
    }

    @GetMapping
    public List<SugestaoResponse> listar() {
        return service.listar();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SugestaoResponse criar(
        Principal principal,
        @Valid @RequestBody SugestaoRequest request
    ) {
        return service.criar(principal.getName(), request);
    }

    @PatchMapping("/{id}/voto")
    public SugestaoResponse votar(@PathVariable UUID id) {
        return service.votar(id);
    }
}
