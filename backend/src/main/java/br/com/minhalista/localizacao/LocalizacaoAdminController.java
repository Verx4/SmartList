package br.com.minhalista.localizacao;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/localizacoes")
public class LocalizacaoAdminController {

    private final LocalizacaoAdminService service;

    public LocalizacaoAdminController(LocalizacaoAdminService service) {
        this.service = service;
    }

    @GetMapping("/resumo")
    public LocalizacaoAdminResponse resumo() {
        return service.resumo();
    }
}
