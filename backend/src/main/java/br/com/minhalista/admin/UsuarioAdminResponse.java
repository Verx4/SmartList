package br.com.minhalista.admin;

import java.time.Instant;
import java.util.UUID;

import br.com.minhalista.assinatura.Assinatura;
import br.com.minhalista.usuario.Usuario;

public record UsuarioAdminResponse(
    UUID id,
    String nome,
    String email,
    String cidade,
    String estado,
    String perfil,
    String tipoAcesso,
    String ciclo,
    boolean assinaturaAtiva,
    Instant assinaturaVenceEm,
    boolean ativo,
    Instant cortesiaAte,
    Instant criadoEm
) {
    public static UsuarioAdminResponse de(Usuario usuario, String ciclo) {
        return new UsuarioAdminResponse(
            usuario.getId(),
            usuario.getNome(),
            usuario.getEmail(),
            usuario.getCidade(),
            usuario.getEstado(),
            usuario.getPerfil().name(),
            usuario.getTipoAcesso().name(),
            ciclo,
            ciclo != null,
            null,
            usuario.isAtivo(),
            usuario.getCortesiaAte(),
            usuario.getCriadoEm()
        );
    }

    public static UsuarioAdminResponse deComAssinatura(
        Usuario usuario,
        Assinatura assinatura
    ) {
        return new UsuarioAdminResponse(
            usuario.getId(),
            usuario.getNome(),
            usuario.getEmail(),
            usuario.getCidade(),
            usuario.getEstado(),
            usuario.getPerfil().name(),
            usuario.getTipoAcesso().name(),
            assinatura == null ? null : assinatura.getCiclo().name(),
            assinatura != null,
            assinatura == null ? null : assinatura.getVenceEm(),
            usuario.isAtivo(),
            usuario.getCortesiaAte(),
            usuario.getCriadoEm()
        );
    }
}
