package br.com.minhalista.assinatura;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class AssinaturaControllerDiagnosticoTest {

    private final AssinaturaController controller = new AssinaturaController(
        null,
        null,
        null,
        null,
        null
    );

    @Test
    void informaAColunaAusenteSemExporTodoOStackTrace() {
        RuntimeException erro = new RuntimeException(
            new RuntimeException(
                "ERROR: column a1_0.cupom_primeira_cobranca_somente does not exist"
            )
        );

        assertEquals(
            "O banco de dados do checkout está desatualizado: falta a coluna "
                + "a1_0.cupom_primeira_cobranca_somente.",
            controller.mensagemFalhaCheckout(erro)
        );
    }

    @Test
    void traduzRecusaDeAltoRiscoEmOrientacaoAcionavel() {
        assertEquals(
            "O Mercado Pago recusou a compra por segurança. Use uma conta compradora "
                + "diferente da conta vendedora e evite novas tentativas imediatas.",
            controller.mensagemPagamentoRejeitado("cc_rejected_high_risk")
        );
    }

    @Test
    void traduzRecusaDoBancoPorLimiteInsuficiente() {
        assertEquals(
            "O banco informou limite insuficiente para concluir a compra.",
            controller.mensagemPagamentoRejeitado("cc_rejected_insufficient_amount")
        );
    }

    @Test
    void mantemMensagemSeguraParaExcecaoNaoReconhecida() {
        assertEquals(
            "Não foi possível preparar o pagamento.",
            controller.mensagemFalhaCheckout(new RuntimeException("falha desconhecida"))
        );
    }
}
