package br.com.minhalista.assinatura;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
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
    void calculaDescontoSobrePrecoVigenteDoPlano() {
        Cupom cupom = new Cupom();
        cupom.setCodigo("SMART10");
        cupom.setPercentualDesconto(new BigDecimal("10.00"));
        cupom.setAtivo(true);

        when(planoService.valorVigente(CicloAssinatura.MENSAL))
            .thenReturn(new BigDecimal("9.97"));
        when(repository.findByCodigoIgnoreCase("SMART10"))
            .thenReturn(Optional.of(cupom));

        CupomAplicacaoResponse resposta = service.aplicar(
            " smart10 ",
            CicloAssinatura.MENSAL
        );

        assertEquals(new BigDecimal("1.00"), resposta.desconto());
        assertEquals(new BigDecimal("8.97"), resposta.total());
        assertEquals("SMART10", resposta.codigo());
    }

    @Test
    void rejeitaCupomInexistenteOuInativo() {
        when(planoService.valorVigente(CicloAssinatura.ANUAL))
            .thenReturn(new BigDecimal("95.64"));
        when(repository.findByCodigoIgnoreCase("INVALIDO"))
            .thenReturn(Optional.empty());

        assertThrows(
            RegraNegocioException.class,
            () -> service.aplicar("INVALIDO", CicloAssinatura.ANUAL)
        );
    }
}
