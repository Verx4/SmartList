package br.com.minhalista.assinatura;

import java.math.BigDecimal;

public enum CicloAssinatura {
    MENSAL("Mensal", new BigDecimal("9.97"), 1),
    TRIMESTRAL("Trimestral", new BigDecimal("26.91"), 3),
    ANUAL("Anual", new BigDecimal("95.64"), 12);

    private final String nome;
    private final BigDecimal valor;
    private final int meses;

    CicloAssinatura(String nome, BigDecimal valor, int meses) {
        this.nome = nome;
        this.valor = valor;
        this.meses = meses;
    }

    public String getNome() {
        return nome;
    }

    public BigDecimal getValor() {
        return valor;
    }

    public int getMeses() {
        return meses;
    }
}
