package br.com.minhalista.common;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {

    private static final Logger LOG = LoggerFactory.getLogger(ApiExceptionHandler.class);

    private final boolean exporErros;

    public ApiExceptionHandler(@Value("${app.expor-erros:false}") boolean exporErros) {
        this.exporErros = exporErros;
    }

    @ExceptionHandler(RegraNegocioException.class)
    public ResponseEntity<Map<String, Object>> tratarRegra(RegraNegocioException erro) {
        return resposta(
            erro.getStatus(),
            erro.getMessage(),
            exporErros ? erro.getDetalhes() : null,
            erro.getCodigoDiagnostico()
        );
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> tratarValidacao(MethodArgumentNotValidException erro) {
        Map<String, String> campos = new LinkedHashMap<>();

        for (FieldError campo : erro.getBindingResult().getFieldErrors()) {
            campos.putIfAbsent(campo.getField(), campo.getDefaultMessage());
        }

        return resposta(HttpStatus.BAD_REQUEST, "Confira os campos informados.", campos, null);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> tratarJsonInvalido(HttpMessageNotReadableException erro) {
        return resposta(
            HttpStatus.BAD_REQUEST,
            "O conteúdo enviado não está no formato esperado.",
            null,
            null
        );
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> tratarInesperado(Exception erro) {
        String codigoDiagnostico = novoCodigoDiagnostico();
        LOG.error(
            "Erro inesperado ao processar a requisição. diagnostico={}.",
            codigoDiagnostico,
            erro
        );
        return resposta(
            HttpStatus.INTERNAL_SERVER_ERROR,
            exporErros
                ? erro.getClass().getSimpleName() + ": " + erro.getMessage()
                : "Não foi possível concluir a operação.",
            exporErros ? detalhesInesperados(erro) : null,
            codigoDiagnostico
        );
    }

    private ResponseEntity<Map<String, Object>> resposta(
        HttpStatus status,
        String mensagem,
        Object detalhes,
        String codigoDiagnostico
    ) {
        Map<String, Object> corpo = new LinkedHashMap<>();
        corpo.put("timestamp", Instant.now());
        corpo.put("status", status.value());
        corpo.put("error", true);
        corpo.put("message", mensagem);
        corpo.put("mensagem", mensagem);

        if (detalhes != null) {
            corpo.put("details", detalhes);
            corpo.put("detalhes", detalhes);
        }

        if (codigoDiagnostico != null && !codigoDiagnostico.isBlank()) {
            corpo.put("diagnosticId", codigoDiagnostico);
        }

        return ResponseEntity.status(status).body(corpo);
    }

    private Map<String, Object> detalhesInesperados(Exception erro) {
        Map<String, Object> detalhes = new LinkedHashMap<>();
        detalhes.put("exception", erro.getClass().getName());
        detalhes.put("message", String.valueOf(erro.getMessage()));

        if (erro.getCause() != null) {
            detalhes.put("cause", erro.getCause().getClass().getName());
            detalhes.put("causeMessage", String.valueOf(erro.getCause().getMessage()));
        }

        return detalhes;
    }

    private String novoCodigoDiagnostico() {
        return UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }
}
