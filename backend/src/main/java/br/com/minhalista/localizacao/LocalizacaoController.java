package br.com.minhalista.localizacao;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/localizacoes")
public class LocalizacaoController {

    private final LocalizacaoService service;

    public LocalizacaoController(LocalizacaoService service) {
        this.service = service;
    }

    @GetMapping("/minha")
    public LocalizacaoResponse minha() {
        return service.minha();
    }

    @PostMapping
    public LocalizacaoResponse salvar(@Valid @RequestBody LocalizacaoRequest request) {
        return service.salvar(request);
    }

    @PostMapping("/unidade-confirmada")
    public LocalizacaoResponse confirmarUnidade(
        @Valid @RequestBody ConfirmarUnidadeRequest request
    ) {
        return service.confirmarUnidade(request);
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revogar() {
        service.revogar();
    }
}
