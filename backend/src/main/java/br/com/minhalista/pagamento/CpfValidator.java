package br.com.minhalista.pagamento;

final class CpfValidator {

    private CpfValidator() {
    }

    static String normalizar(String valor) {
        return valor == null ? "" : valor.replaceAll("\\D", "");
    }

    static boolean valido(String valor) {
        String cpf = normalizar(valor);

        if (!cpf.matches("\\d{11}") || cpf.chars().distinct().count() == 1) {
            return false;
        }

        int primeiro = digitoVerificador(cpf, 9, 10);
        int segundo = digitoVerificador(cpf, 10, 11);

        return primeiro == Character.digit(cpf.charAt(9), 10)
            && segundo == Character.digit(cpf.charAt(10), 10);
    }

    private static int digitoVerificador(String cpf, int tamanho, int pesoInicial) {
        int soma = 0;

        for (int indice = 0; indice < tamanho; indice++) {
            soma += Character.digit(cpf.charAt(indice), 10) * (pesoInicial - indice);
        }

        int resto = (soma * 10) % 11;
        return resto == 10 ? 0 : resto;
    }
}

