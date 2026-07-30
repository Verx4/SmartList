package br.com.minhalista.localizacao;

import java.time.Instant;
import java.util.UUID;

public record LocalizacaoResponse(
    boolean consentimentoAtivo,
    boolean coordenadasDisponiveis,
    String bairro,
    String cidade,
    String estado,
    OrigemLocalizacao origem,
    Instant atualizadaEm,
    Instant coordenadasExpiramEm,
    Instant localidadeExpiraEm,
    UUID unidadeConfirmadaId,
    String unidadeConfirmada,
    String redeConfirmada
) {
}
