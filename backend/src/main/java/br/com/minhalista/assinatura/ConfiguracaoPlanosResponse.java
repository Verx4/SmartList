package br.com.minhalista.assinatura;

public record ConfiguracaoPlanosResponse(boolean exibirCupons) {
    public static ConfiguracaoPlanosResponse de(ConfiguracaoPlanos configuracao) {
        return new ConfiguracaoPlanosResponse(configuracao.isExibirCupons());
    }
}
