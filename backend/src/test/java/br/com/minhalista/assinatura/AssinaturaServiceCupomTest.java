package br.com.minhalista.assinatura;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import br.com.minhalista.usuario.Usuario;
import br.com.minhalista.usuario.UsuarioService;

@ExtendWith(MockitoExtension.class)
class AssinaturaServiceCupomTest {

    @Mock
    private AssinaturaRepository repository;

    @Mock
    private UsuarioService usuarioService;

    @Mock
    private AssinaturaValidadeService validadeService;

    @Mock
    private PlanoService planoService;

    @Mock
    private CupomService cupomService;

    private AssinaturaService service;

    @BeforeEach
    void preparar() {
        service = new AssinaturaService(
            repository,
            usuarioService,
            validadeService,
            planoService,
            cupomService
        );
        when(repository.save(any(Assinatura.class)))
            .thenAnswer(invocacao -> invocacao.getArgument(0));
    }

    @Test
    void salvaAuditoriaCompletaDoCupomNoCheckout() {
        when(cupomService.aplicar("CLUBE5", CicloAssinatura.MENSAL))
            .thenReturn(new CupomAplicacaoResponse(
                "CLUBE5",
                new BigDecimal("5.00"),
                new BigDecimal("9.97"),
                new BigDecimal("0.50"),
                new BigDecimal("9.47"),
                CicloAssinatura.MENSAL,
                true
            ));

        Assinatura assinatura = service.iniciarCheckout(
            new Usuario(),
            CicloAssinatura.MENSAL,
            "CLUBE5"
        );

        assertEquals(new BigDecimal("9.47"), assinatura.getValor());
        assertEquals("CLUBE5", assinatura.getCupomCodigo());
        assertEquals(new BigDecimal("5.00"), assinatura.getCupomPercentualDesconto());
        assertEquals(new BigDecimal("0.50"), assinatura.getCupomValorDesconto());
        assertEquals(new BigDecimal("9.97"), assinatura.getCupomValorOriginal());
        assertNotNull(assinatura.getCupomAplicadoEm());
        assertTrue(assinatura.isCupomPrimeiraCobrancaSomente());
        assertFalse(assinatura.isCupomPrimeiroPagamentoAplicado());
    }
}
