package br.com.minhalista.assinatura;

import java.math.BigDecimal;

public enum CicloAssinatura {
    MENSAL("premium_monthly", "Mensal", new BigDecimal("9.97"), 1),
    TRIMESTRAL("premium_quarterly", "Trimestral", new BigDecimal("26.91"), 3),
    ANUAL("premium_yearly", "Anual", new BigDecimal("95.64"), 12);

    private final String planId;
    private final String nome;
    private final BigDecimal valor;
    private final int meses;

    CicloAssinatura(String planId, String nome, BigDecimal valor, int meses) {
        this.planId = planId;
        this.nome = nome;
        this.valor = valor;
        this.meses = meses;
    }

    public String getPlanId() {
        return planId;
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

    public static CicloAssinatura porPlanId(String planId) {
        if (planId == null) {
            return null;
        }

        for (CicloAssinatura ciclo : values()) {
            if (ciclo.planId.equalsIgnoreCase(planId.trim())) {
                return ciclo;
            }
        }

        return null;
    }
}
