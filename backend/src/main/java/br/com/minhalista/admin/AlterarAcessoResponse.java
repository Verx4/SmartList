package br.com.minhalista.admin;

public record AlterarAcessoResponse(
    UsuarioAdminResponse usuario,
    boolean assinaturaAtiva,
    String mensagem
) {
}
