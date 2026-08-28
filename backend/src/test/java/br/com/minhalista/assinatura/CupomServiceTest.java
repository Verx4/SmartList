package br.com.minhalista.assinatura;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.Optional;

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
        when(repository.findByCodigoIgnoreCase("CLUBE5"))
            .thenReturn(Optional.of(cupom("CLUBE5", CicloAssinatura.MENSAL, true)));
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
        when(repository.findByCodigoIgnoreCase("SMART10"))
            .thenReturn(Optional.of(cupom("SMART10", CicloAssinatura.TRIMESTRAL, true)));
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
        when(repository.findByCodigoIgnoreCase("CLUBE5"))
            .thenReturn(Optional.of(cupom("CLUBE5", CicloAssinatura.MENSAL, true)));

        assertThrows(
            RegraNegocioException.class,
            () -> service.aplicar("CLUBE5", CicloAssinatura.TRIMESTRAL)
        );
    }

    @Test
    void rejeitaCupomDeDezNoPlanoMensal() {
        when(repository.findByCodigoIgnoreCase("SMART10"))
            .thenReturn(Optional.of(cupom("SMART10", CicloAssinatura.TRIMESTRAL, true)));

        assertThrows(
            RegraNegocioException.class,
            () -> service.aplicar("SMART10", CicloAssinatura.MENSAL)
        );
    }

    @Test
    void rejeitaQualquerCupomNoPlanoAnual() {
        when(repository.findByCodigoIgnoreCase("SMART10"))
            .thenReturn(Optional.of(cupom("SMART10", CicloAssinatura.TRIMESTRAL, true)));

        assertThrows(
            RegraNegocioException.class,
            () -> service.aplicar("SMART10", CicloAssinatura.ANUAL)
        );
    }

    @Test
    void rejeitaCodigoSemSufixoPromocional() {
        assertThrows(
            RegraNegocioException.class,
            () -> service.aplicar("INVALIDO", CicloAssinatura.MENSAL)
        );
    }

    @Test
    void rejeitaCodigoNaoCadastradoNoAdm() {
        when(repository.findByCodigoIgnoreCase("NAOEXISTE5"))
            .thenReturn(Optional.empty());

        assertThrows(
            RegraNegocioException.class,
            () -> service.aplicar("NAOEXISTE5", CicloAssinatura.MENSAL)
        );
    }

    @Test
    void rejeitaCodigoDesativadoNoAdm() {
        when(repository.findByCodigoIgnoreCase("PAUSADO5"))
            .thenReturn(Optional.of(cupom("PAUSADO5", CicloAssinatura.MENSAL, false)));

        assertThrows(
            RegraNegocioException.class,
            () -> service.aplicar("PAUSADO5", CicloAssinatura.MENSAL)
        );
    }

    @Test
    void administradorEscolheONomeCompletoDoCupom() {
        when(repository.findByCodigoIgnoreCase("TROPA5"))
            .thenReturn(Optional.empty());
        when(repository.save(org.mockito.ArgumentMatchers.any(Cupom.class)))
            .thenAnswer(invocacao -> invocacao.getArgument(0));

        CupomResponse resposta = service.salvar(
            new CupomAdminRequest("tropa5", CicloAssinatura.MENSAL, true)
        );

        assertEquals("TROPA5", resposta.codigo());
        assertEquals(CicloAssinatura.MENSAL, resposta.ciclo());
        assertEquals(new BigDecimal("5.00"), resposta.percentualDesconto());
        assertTrue(resposta.ativo());
    }

    private Cupom cupom(
        String codigo,
        CicloAssinatura ciclo,
        boolean ativo
    ) {
        Cupom cupom = new Cupom();
        cupom.setCodigo(codigo);
        cupom.setCiclo(ciclo);
        cupom.setPercentualDesconto(
            ciclo == CicloAssinatura.TRIMESTRAL
                ? new BigDecimal("10.00")
                : new BigDecimal("5.00")
        );
        cupom.setAtivo(ativo);
        return cupom;
    }
}
