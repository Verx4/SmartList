package br.com.minhalista.admin;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.com.minhalista.common.RegraNegocioException;
import br.com.minhalista.scraper.ExecucaoScraperResponse;
import br.com.minhalista.scraper.PrecoColetadoRequest;
import br.com.minhalista.scraper.PrecoColetadoResponse;
import br.com.minhalista.scraper.ScraperService;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/admin/scrapers")
public class AdminScraperController {

    private final ScraperService service;

    public AdminScraperController(ScraperService service) {
        this.service = service;
    }

    @GetMapping("/configuracao")
    public ScraperConfigResponse configuracao() {
        return respostaConfiguracao();
    }

    @PutMapping("/configuracao")
    public ScraperConfigResponse salvarConfiguracao(@Valid @RequestBody ScraperConfigRequest request) {
        if (request.margemPercentual().compareTo(ScraperService.MARGEM_PERCENTUAL) != 0) {
            throw new RegraNegocioException(
                HttpStatus.BAD_REQUEST,
                "A margem de segurança do scraper deve permanecer em 5%."
            );
        }

        return respostaConfiguracao();
    }

    @PostMapping("/executar")
    public ExecucaoScraperResponse executar() {
        return service.executar(false);
    }

    @GetMapping("/execucoes")
    public List<ExecucaoScraperResponse> execucoes() {
        return service.ultimasExecucoes();
    }

    @PostMapping("/precos")
    @ResponseStatus(HttpStatus.CREATED)
    public PrecoColetadoResponse registrarPreco(@Valid @RequestBody PrecoColetadoRequest request) {
        return service.registrarPreco(request);
    }

    private ScraperConfigResponse respostaConfiguracao() {
        return new ScraperConfigResponse(
            ScraperService.MARGEM_PERCENTUAL,
            "Faixa estimada: preço original -5% até preço original +5%.",
            true
        );
    }
}
