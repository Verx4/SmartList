package br.com.minhalista.despensa;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

public record CompraDespensaRequest(
    @NotEmpty(message = "Informe os itens comprados.")
    @Size(max = 300)
    List<@Valid ItemCompraDespensaRequest> itens
) { }
