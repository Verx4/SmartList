package br.com.minhalista.usuario;

public final class Cpf {

    private Cpf() {
    }

    public static String somenteDigitos(String valor) {
        return valor == null ? "" : valor.replaceAll("\\D", "");
    }

    public static boolean valido(String valor) {
        String informado = valor == null ? "" : valor.trim();

        if (!informado.matches("^(?:\\d{11}|\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2})$")) {
            return false;
        }

        String cpf = somenteDigitos(valor);

        if (cpf.length() != 11 || cpf.chars().distinct().count() == 1) {
            return false;
        }

        return calcularDigito(cpf, 9) == Character.digit(cpf.charAt(9), 10)
            && calcularDigito(cpf, 10) == Character.digit(cpf.charAt(10), 10);
    }

    public static String mascarar(String valor) {
        String cpf = somenteDigitos(valor);

        if (cpf.length() != 11) {
            return null;
        }

        return "***.***.***-" + cpf.substring(9);
    }

    public static String formatar(String valor) {
        String cpf = somenteDigitos(valor);

        if (cpf.length() != 11) {
            return null;
        }

        return cpf.substring(0, 3)
            + "." + cpf.substring(3, 6)
            + "." + cpf.substring(6, 9)
            + "-" + cpf.substring(9);
    }

    private static int calcularDigito(String cpf, int quantidade) {
        int soma = 0;

        for (int indice = 0; indice < quantidade; indice++) {
            soma += Character.digit(cpf.charAt(indice), 10) * (quantidade + 1 - indice);
        }

        int resto = (soma * 10) % 11;
        return resto == 10 ? 0 : resto;
    }
}
