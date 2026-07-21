package br.com.minhalista.nota;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/notas")
public class NotaFiscalController {

    private final NotaFiscalService service;

    public NotaFiscalController(NotaFiscalService service) {
        this.service = service;
    }

    @PostMapping("/consultar")
    public ResponseEntity<NotaFiscalResponse> consultar(
        @Valid @RequestBody ConsultaNotaRequest request
    ) {
        return ResponseEntity.ok(service.consultar(request.url()));
    }
}

