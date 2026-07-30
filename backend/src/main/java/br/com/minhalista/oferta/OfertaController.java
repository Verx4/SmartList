package br.com.minhalista.oferta;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;

@RestController
@RequestMapping("/api/ofertas")
public class OfertaController {

    private final OfertaService service;

    public OfertaController(OfertaService service) {
        this.service = service;
    }

    @PostMapping("/buscar")
    public OfertaListaResponse buscar(@Valid @RequestBody OfertaBuscaRequest request) {
        return service.buscar(request);
    }

    @GetMapping("/unidades-proximas")
    public List<UnidadeProximaResponse> unidadesProximas(
        @RequestParam @DecimalMin("-90.0") @DecimalMax("90.0") double latitude,
        @RequestParam @DecimalMin("-180.0") @DecimalMax("180.0") double longitude,
        @RequestParam(defaultValue = "25")
        @DecimalMin("1.0") @DecimalMax("100.0") double raioKm
    ) {
        return service.unidadesProximas(latitude, longitude, raioKm);
    }
}
