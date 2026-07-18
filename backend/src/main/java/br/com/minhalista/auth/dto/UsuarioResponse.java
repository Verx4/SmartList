package br.com.minhalista.auth.dto;

import java.util.UUID;

import br.com.minhalista.usuario.Usuario;

public record UsuarioResponse(
    UUID id,
    String nome,
    String email,
    String perfil,
    String tipoAcesso,
    boolean ativo,
    boolean assinaturaAtiva
) {
    public static UsuarioResponse de(Usuario usuario) {
        return new UsuarioResponse(
            usuario.getId(),
            usuario.getNome(),
            usuario.getEmail(),
            usuario.getPerfil().name(),
            usuario.getTipoAcesso().name(),
            usuario.isAtivo(),
            usuario.isAtivo()
        );
    }
}
