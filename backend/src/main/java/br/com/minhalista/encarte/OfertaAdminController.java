package br.com.minhalista.encarte;

import java.util.List;
import java.util.UUID;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PathVariable;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/admin/ofertas")
public class OfertaAdminController {

    private final OfertaAdminService service;

    public OfertaAdminController(OfertaAdminService service) {
        this.service = service;
    }

    @GetMapping("/unidades")
    public List<UnidadeMercadoAdminResponse> unidades() {
        return service.unidades();
    }

    @PostMapping("/unidades")
    public UnidadeMercadoAdminResponse salvarUnidade(
        @Valid @RequestBody UnidadeMercadoAdminRequest request
    ) {
        return service.salvarUnidade(request);
    }

    @GetMapping("/fontes")
    public List<FonteEncarteAdminResponse> fontes() {
        return service.fontes();
    }

    @PostMapping("/fontes")
    public FonteEncarteAdminResponse salvarFonte(
        @Valid @RequestBody FonteEncarteAdminRequest request
    ) {
        return service.salvarFonte(request);
    }

    @PostMapping("/fontes/{id}/processar")
    public FonteEncarteAdminResponse processar(@PathVariable UUID id) {
        return service.processar(id);
    }
}
