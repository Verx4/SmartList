package br.com.minhalista.assinatura;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import br.com.minhalista.common.RegraNegocioException;

@ExtendWith(MockitoExtension.class)
class CupomServiceTest {

    @Mock
    private CupomRepository repository;

    @Mock
    private PlanoService planoService;

    private CupomService service;

    @BeforeEach
    void preparar() {
        service = new CupomService(repository, planoService);
    }

    @Test
    void aplicaCincoPorCentoNoPlanoMensal() {
        when(planoService.valorVigente(CicloAssinatura.MENSAL))
            .thenReturn(new BigDecimal("9.97"));

        CupomAplicacaoResponse resposta = service.aplicar(
            " clube5 ",
            CicloAssinatura.MENSAL
        );

        assertEquals(new BigDecimal("5.00"), resposta.percentualDesconto());
        assertEquals(new BigDecimal("0.50"), resposta.desconto());
        assertEquals(new BigDecimal("9.47"), resposta.total());
        assertEquals("CLUBE5", resposta.codigo());
        assertEquals(CicloAssinatura.MENSAL, resposta.cicloPermitido());
        assertTrue(resposta.primeiraCobrancaSomente());
    }

    @Test
    void aplicaDezPorCentoNoPlanoTrimestral() {
        when(planoService.valorVigente(CicloAssinatura.TRIMESTRAL))
            .thenReturn(new BigDecimal("26.91"));

        CupomAplicacaoResponse resposta = service.aplicar(
            "SMART10",
            CicloAssinatura.TRIMESTRAL
        );

        assertEquals(new BigDecimal("10.00"), resposta.percentualDesconto());
        assertEquals(new BigDecimal("2.69"), resposta.desconto());
        assertEquals(new BigDecimal("24.22"), resposta.total());
        assertEquals(CicloAssinatura.TRIMESTRAL, resposta.cicloPermitido());
    }

    @Test
    void rejeitaCupomDeCincoNoPlanoTrimestral() {
        when(planoService.valorVigente(CicloAssinatura.TRIMESTRAL))
            .thenReturn(new BigDecimal("26.91"));

        assertThrows(
            RegraNegocioException.class,
            () -> service.aplicar("CLUBE5", CicloAssinatura.TRIMESTRAL)
        );
    }

    @Test
    void rejeitaCupomDeDezNoPlanoMensal() {
        when(planoService.valorVigente(CicloAssinatura.MENSAL))
            .thenReturn(new BigDecimal("9.97"));

        assertThrows(
            RegraNegocioException.class,
            () -> service.aplicar("SMART10", CicloAssinatura.MENSAL)
        );
    }

    @Test
    void rejeitaQualquerCupomNoPlanoAnual() {
        when(planoService.valorVigente(CicloAssinatura.ANUAL))
            .thenReturn(new BigDecimal("95.64"));

        assertThrows(
            RegraNegocioException.class,
            () -> service.aplicar("SMART10", CicloAssinatura.ANUAL)
        );
    }

    @Test
    void rejeitaCodigoSemSufixoPromocional() {
        when(planoService.valorVigente(CicloAssinatura.MENSAL))
            .thenReturn(new BigDecimal("9.97"));

        assertThrows(
            RegraNegocioException.class,
            () -> service.aplicar("INVALIDO", CicloAssinatura.MENSAL)
        );
    }
}
