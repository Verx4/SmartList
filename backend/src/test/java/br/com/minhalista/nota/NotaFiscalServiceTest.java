package br.com.minhalista.nota;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.net.URI;

import org.junit.jupiter.api.Test;

import br.com.minhalista.common.RegraNegocioException;

class NotaFiscalServiceTest {

    private final NotaFiscalService service = new NotaFiscalService();

    @Test
    void extraiItensDoFormatoComumDaNfce() {
        String html = """
            <html><body>
              <div id="u20">Mercado Exemplo LTDA</div>
              <div class="chave">26190712345678000123650010000001231000001234</div>
              <table id="tabResult">
                <tr><td><span class="txtTit">ARROZ PARBOILIZADO (Código: 10)</span>
                  <span class="Rqtd"><strong>Qtde.:</strong> 2</span>
                  <span class="RUN"><strong>UN:</strong> UN</span>
                  <span class="RvlUnit"><strong>Vl. Unit.:</strong> 7,50</span></td>
                  <td><span class="valor">15,00</span></td></tr>
                <tr><td><span class="txtTit">BANANA PRATA</span>
                  <span class="Rqtd"><strong>Qtde.:</strong> 0,750</span>
                  <span class="RUN"><strong>UN:</strong> KG</span>
                  <span class="RvlUnit"><strong>Vl. Unit.:</strong> 8,00</span></td>
                  <td><span class="valor">6,00</span></td></tr>
              </table>
              <div id="totalNota"><span class="txtMax">R$ 21,00</span></div>
            </body></html>
            """;

        NotaFiscalResponse resposta = service.analisarDocumento(
            html,
            URI.create("https://nfce.sefaz.pe.gov.br/nfce-web/consultarNFCe?p=teste")
        );

        assertThat(resposta.mercado()).isEqualTo("Mercado Exemplo LTDA");
        assertThat(resposta.valorTotal()).isEqualByComparingTo("21.00");
        assertThat(resposta.itens()).hasSize(2);
        assertThat(resposta.itens().get(0).nome()).isEqualTo("ARROZ PARBOILIZADO");
        assertThat(resposta.itens().get(0).quantidade()).isEqualByComparingTo(BigDecimal.valueOf(2));
        assertThat(resposta.itens().get(1).unidade()).isEqualTo("KG");
        assertThat(resposta.itens().get(1).valorTotal()).isEqualByComparingTo("6.00");
    }

    @Test
    void normalizaSeparadoresOficiaisDoQrCodeDaNfce() {
        String endereco = service.normalizarEndereco(
            "http://nfce.sefaz.pe.gov.br/nfce/consulta?p="
                + "00000000000000000000000000000000000000000000|2|1|1"
        );

        URI uri = URI.create(endereco);

        assertThat(uri.getHost()).isEqualTo("nfce.sefaz.pe.gov.br");
        assertThat(uri.getRawQuery()).contains("%7C2%7C1%7C1");
    }

    @Test
    void rejeitaEnderecoQueNaoPertenceAoGoverno() {
        assertThatThrownBy(() -> service.validarUrl("https://exemplo.com/nota"))
            .isInstanceOf(RegraNegocioException.class)
            .hasMessage("O QR Code não aponta para um portal fiscal oficial.");
    }
}
