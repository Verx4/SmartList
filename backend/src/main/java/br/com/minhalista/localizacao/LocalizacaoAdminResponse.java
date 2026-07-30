package br.com.minhalista.localizacao;

import java.time.Instant;
import java.util.List;

public record LocalizacaoAdminResponse(
    Instant geradoEm,
    long usuariosComConsentimentoAtivo,
    long atualizadosNasUltimas24Horas,
    List<LocalidadeAgregadaResponse> localidades,
    List<RedeConfirmadaResponse> redesConfirmadas,
    String privacidade
) {
}
