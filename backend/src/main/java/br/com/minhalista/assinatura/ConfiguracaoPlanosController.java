package br.com.minhalista.assinatura;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/assinaturas/configuracao-planos")
public class ConfiguracaoPlanosController {
    private final PlanoService service;

    public ConfiguracaoPlanosController(PlanoService service) {
        this.service = service;
    }

    @GetMapping
    public ConfiguracaoPlanosResponse consultar() {
        return service.configuracao();
    }
}
