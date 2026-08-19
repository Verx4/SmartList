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
    public static UsuarioAdminResponse de(Usuario usuario, Assinatura assinaturaAtiva) {
        return new UsuarioAdminResponse(
            usuario.getId(),
            usuario.getNome(),
            usuario.getEmail(),
            usuario.getCidade(),
            usuario.getEstado(),
            usuario.getPerfil().name(),
            usuario.getTipoAcesso().name(),
            assinaturaAtiva == null ? null : assinaturaAtiva.getCiclo().name(),
            assinaturaAtiva != null,
            assinaturaAtiva == null ? null : assinaturaAtiva.getVenceEm(),
            usuario.isAtivo(),
            usuario.getCortesiaAte(),
            usuario.getCriadoEm()
        );
    }
}
