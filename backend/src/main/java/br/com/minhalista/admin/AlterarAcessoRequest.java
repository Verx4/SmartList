package br.com.minhalista.admin;

import br.com.minhalista.usuario.TipoAcesso;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AlterarAcessoRequest(
    @NotNull(message = "Informe o novo tipo de acesso.")
    TipoAcesso tipoAcesso,

    @Min(value = 1, message = "A cortesia deve possuir pelo menos 1 dia.")
    @Max(value = 3650, message = "A cortesia deve possuir no máximo 3650 dias.")
    Integer diasCortesia,

    @NotBlank(message = "Informe o motivo da alteração.")
    @Size(max = 300, message = "O motivo deve possuir no máximo 300 caracteres.")
    String motivo,

    boolean confirmarAssinaturaAtiva
) {
}
