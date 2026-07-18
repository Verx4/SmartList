package br.com.minhalista.auth.dto;

import java.util.UUID;

import br.com.minhalista.usuario.Usuario;

public record UsuarioResponse(
    UUID id,
    String nome,
    String email,
    String telefone,
    String cidade,
    String estado,
    boolean notificarPromocoes,
    boolean notificarPrecos,
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
            usuario.getTelefone(),
            usuario.getCidade(),
            usuario.getEstado(),
            usuario.isNotificarPromocoes(),
            usuario.isNotificarPrecos(),
            usuario.getPerfil().name(),
            usuario.getTipoAcesso().name(),
            usuario.isAtivo(),
            usuario.temAcessoPremium()
        );
    }
}
