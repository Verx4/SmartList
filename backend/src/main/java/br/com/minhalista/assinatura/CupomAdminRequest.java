package br.com.minhalista.assinatura;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record CupomAdminRequest(
    @NotBlank(message = "Informe o código do cupom.")
    @Pattern(
        regexp = "[A-Za-z0-9_-]{1,30}",
        message = "Use de 1 a 30 letras, números, hífen ou sublinhado no cupom."
    )
    String codigo,

    @NotNull(message = "Escolha o plano do cupom.")
    CicloAssinatura ciclo,

    boolean ativo
) {
}
