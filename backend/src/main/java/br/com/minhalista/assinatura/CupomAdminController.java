package br.com.minhalista.assinatura;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/admin/cupons")
public class CupomAdminController {

    private final CupomService service;

    public CupomAdminController(CupomService service) {
        this.service = service;
    }

    @GetMapping
    public List<CupomResponse> listar() {
        return service.listar();
    }

    @PostMapping
    public CupomResponse salvar(@Valid @RequestBody CupomAdminRequest request) {
        return service.salvar(request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@PathVariable UUID id) {
        service.excluir(id);
        return ResponseEntity.noContent().build();
    }
}
