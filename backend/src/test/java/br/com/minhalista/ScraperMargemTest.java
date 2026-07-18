package br.com.minhalista;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;

import br.com.minhalista.scraper.ExecucaoScraperRepository;
import br.com.minhalista.scraper.NivelConfianca;
import br.com.minhalista.scraper.PrecoColetado;
import br.com.minhalista.scraper.PrecoColetadoRepository;
import br.com.minhalista.scraper.PrecoColetadoRequest;
import br.com.minhalista.scraper.PrecoColetadoResponse;
import br.com.minhalista.scraper.ScraperService;

class ScraperMargemTest {

    @Test
    void preservaOriginalECalculaFaixaDeCincoPorCento() {
        ExecucaoScraperRepository execucoes = mock(ExecucaoScraperRepository.class);
        PrecoColetadoRepository precos = mock(PrecoColetadoRepository.class);
        when(precos.save(any(PrecoColetado.class))).thenAnswer(invocacao -> invocacao.getArgument(0));

        ScraperService service = new ScraperService(execucoes, precos);
        PrecoColetadoResponse resposta = service.registrarPreco(new PrecoColetadoRequest(
            "Arroz",
            "Assaí",
            new BigDecimal("100.00"),
            NivelConfianca.ALTA,
            "https://exemplo.test/arroz"
        ));

        assertThat(resposta.precoOriginal()).isEqualByComparingTo("100.00");
        assertThat(resposta.margemPercentual()).isEqualByComparingTo("5.00");
        assertThat(resposta.precoMinimo()).isEqualByComparingTo("95.00");
        assertThat(resposta.precoMaximo()).isEqualByComparingTo("105.00");
    }
}
