package br.com.minhalista.usuario;

public record CpfPerfilResponse(
    boolean cadastrado,
    String cpfMascarado
) {
    public static CpfPerfilResponse de(Usuario usuario) {
        String mascarado = Cpf.mascarar(usuario.getCpf());
        return new CpfPerfilResponse(mascarado != null, mascarado);
    }
}
