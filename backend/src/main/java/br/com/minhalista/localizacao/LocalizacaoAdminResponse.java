package br.com.minhalista.localizacao;

import java.time.Instant;
import java.util.List;

public record LocalizacaoAdminResponse(
    Instant geradoEm,
    long usuariosComLocalidade,
    long novosCadastrosNasUltimas24Horas,
    List<LocalidadeAgregadaResponse> localidades,
    List<EstadoAgregadoResponse> estados,
    List<RedeConfirmadaResponse> redesConfirmadas,
    String privacidade
) {
}
