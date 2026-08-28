package br.com.minhalista.sugestao;

public record NotificacaoSugestoesResponse(long quantidade) {
    public boolean possuiNovasRespostas() {
        return quantidade > 0;
    }
}
