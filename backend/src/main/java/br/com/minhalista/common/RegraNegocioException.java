package br.com.minhalista.common;

import org.springframework.http.HttpStatus;

public class RegraNegocioException extends RuntimeException {

    private final HttpStatus status;
    private final Object detalhes;
    private final String codigoDiagnostico;

    public RegraNegocioException(HttpStatus status, String mensagem) {
        this(status, mensagem, null, null);
    }

    public RegraNegocioException(
        HttpStatus status,
        String mensagem,
        Object detalhes
    ) {
        this(status, mensagem, detalhes, null);
    }

    public RegraNegocioException(
        HttpStatus status,
        String mensagem,
        Object detalhes,
        String codigoDiagnostico
    ) {
        super(mensagem);
        this.status = status;
        this.detalhes = detalhes;
        this.codigoDiagnostico = codigoDiagnostico;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public Object getDetalhes() {
        return detalhes;
    }

    public String getCodigoDiagnostico() {
        return codigoDiagnostico;
    }
}
