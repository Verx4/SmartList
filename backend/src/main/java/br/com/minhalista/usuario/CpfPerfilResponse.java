package br.com.minhalista.usuario;

public record CpfPerfilResponse(
    boolean cadastrado,
    String cpf,
    String cpfMascarado
) {
    public static CpfPerfilResponse de(Usuario usuario) {
        String formatado = Cpf.formatar(usuario.getCpf());
        String mascarado = Cpf.mascarar(usuario.getCpf());
        return new CpfPerfilResponse(
            formatado != null,
            formatado,
            mascarado
        );
    }
}
