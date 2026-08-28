package br.com.minhalista.assinatura;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/admin/planos")
public class PlanoAdminController {

    private final PlanoService service;

    public PlanoAdminController(PlanoService service) {
        this.service = service;
    }

    @GetMapping
    public List<PlanoResponse> listar() {
        return service.catalogo();
    }

    @PutMapping
    public List<PlanoResponse> atualizar(
        @Valid @RequestBody PlanosAdminRequest request
    ) {
        return service.atualizar(request);
    }
}
