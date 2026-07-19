package br.com.minhalista.admin;

import java.time.Instant;
import java.util.UUID;

public record HistoricoAcessoResponse(
    UUID id,
    UUID usuarioId,
    String usuarioEmail,
    String administradorEmail,
    String acessoAnterior,
    String acessoNovo,
    String motivo,
    boolean assinaturaAtiva,
    Instant criadoEm
) {
    public static HistoricoAcessoResponse de(HistoricoAcessoUsuario historico) {
        return new HistoricoAcessoResponse(
            historico.getId(),
            historico.getUsuarioId(),
            historico.getUsuarioEmail(),
            historico.getAdministradorEmail(),
            historico.getAcessoAnterior().name(),
            historico.getAcessoNovo().name(),
            historico.getMotivo(),
            historico.isAssinaturaAtiva(),
            historico.getCriadoEm()
        );
    }
}
