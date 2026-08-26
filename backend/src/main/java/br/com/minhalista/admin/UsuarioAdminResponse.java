package br.com.minhalista.admin;

import java.time.Instant;
import java.util.UUID;

import br.com.minhalista.assinatura.Assinatura;
import br.com.minhalista.usuario.TipoAcesso;
import br.com.minhalista.usuario.Usuario;

public record UsuarioAdminResponse(
    UUID id,
    String nome,
    String email,
    String cidade,
    String estado,
    String perfil,
    String tipoAcesso,
    String classificacaoAcesso,
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
            classificar(usuario, null),
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
            classificar(usuario, assinatura),
            assinatura == null ? null : assinatura.getCiclo().name(),
            assinatura != null,
            assinatura == null ? null : assinatura.getVenceEm(),
            usuario.isAtivo(),
            usuario.getCortesiaAte(),
            usuario.getCriadoEm()
        );
    }

    private static String classificar(
        Usuario usuario,
        Assinatura assinatura
    ) {
        if (assinatura != null) {
            return "PAGANTE";
        }

        if (usuario.getTipoAcesso() == TipoAcesso.CORTESIA
            && usuario.getCortesiaAte() != null
            && usuario.getCortesiaAte().isAfter(Instant.now())) {
            return "CORTESIA";
        }

        if (usuario.getTipoAcesso() == TipoAcesso.PREMIUM) {
            return "PREMIUM_MANUAL";
        }

        return "FREE";
    }
}
