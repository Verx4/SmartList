package br.com.minhalista.admin;

import java.time.Instant;
import java.util.UUID;

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
            usuario.isAtivo(),
            usuario.getCortesiaAte(),
            usuario.getCriadoEm()
        );
    }
}
