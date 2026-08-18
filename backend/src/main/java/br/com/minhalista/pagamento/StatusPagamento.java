package br.com.minhalista.pagamento;

public enum StatusPagamento {
    CREATED,
    PENDING,
    APPROVED,
    REJECTED,
    CANCELLED,
    EXPIRED,
    REFUNDED;

    public boolean terminal() {
        return this == APPROVED
            || this == REJECTED
            || this == CANCELLED
            || this == EXPIRED
            || this == REFUNDED;
    }
}
