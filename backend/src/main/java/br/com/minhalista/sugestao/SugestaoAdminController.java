package br.com.minhalista.sugestao;

import java.util.List;
import java.util.UUID;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/admin/sugestoes")
public class SugestaoAdminController {

    private final SugestaoService service;

    public SugestaoAdminController(SugestaoService service) {
        this.service = service;
    }

    @GetMapping
    public List<SugestaoResponse> listar() {
        return service.listar();
    }

    @PatchMapping("/{id}/status")
    public SugestaoResponse atualizarStatus(
        @PathVariable UUID id,
        @Valid @RequestBody SugestaoStatusRequest request
    ) {
        return service.atualizarStatus(id, request.status());
    }
}
