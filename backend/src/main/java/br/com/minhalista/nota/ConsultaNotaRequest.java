package br.com.minhalista.nota;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ConsultaNotaRequest(
    @NotBlank(message = "Informe o endereço lido no QR Code.")
    @Size(max = 2048, message = "O endereço do QR Code é muito longo.")
    String url
) {
}

