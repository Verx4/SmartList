package br.com.minhalista.admin;

import java.time.Instant;
import java.util.UUID;

import br.com.minhalista.usuario.Usuario;

public record AdministradorResponse(
    UUID id,
    String nome,
    String email,
    Instant criadoEm,
    boolean fundador
) {
    public static AdministradorResponse de(Usuario usuario, boolean fundador) {
        return new AdministradorResponse(
            usuario.getId(),
            usuario.getNome(),
            usuario.getEmail(),
            usuario.getCriadoEm(),
            fundador
        );
    }
}
