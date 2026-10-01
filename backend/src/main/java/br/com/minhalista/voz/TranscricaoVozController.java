package br.com.minhalista.voz;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/voz")
public class TranscricaoVozController {

    private final TranscricaoVozService service;

    public TranscricaoVozController(TranscricaoVozService service) {
        this.service = service;
    }

    @PostMapping(value = "/transcrever", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> transcrever(
        @RequestPart("audio") MultipartFile audio
    ) {
        try {
            return ResponseEntity.ok(Map.of("texto", service.transcrever(audio)));
        } catch (IllegalArgumentException erro) {
            return ResponseEntity.badRequest().body(Map.of("mensagem", erro.getMessage()));
        } catch (IllegalStateException erro) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of("mensagem", erro.getMessage()));
        }
    }
}
