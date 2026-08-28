package br.com.minhalista.assinatura;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PlanoServiceTest {

    @Mock
    private PlanoRepository repository;

    @InjectMocks
    private PlanoService service;

    @Test
    void deveUsarValoresDoBancoNoCatalogo() {
        when(repository.findAll()).thenReturn(List.of(
            new Plano(CicloAssinatura.MENSAL, new BigDecimal("12.50")),
            new Plano(CicloAssinatura.TRIMESTRAL, new BigDecimal("30.00")),
            new Plano(CicloAssinatura.ANUAL, new BigDecimal("100.00"))
        ));

        List<PlanoResponse> catalogo = service.catalogo();

        assertEquals(new BigDecimal("12.50"), catalogo.get(0).valor());
        assertEquals(new BigDecimal("30.00"), catalogo.get(1).valor());
        assertEquals(new BigDecimal("100.00"), catalogo.get(2).valor());
    }

    @Test
    void deveSalvarOsTresPrecosInformadosPeloAdministrador() {
        when(repository.findById(any())).thenReturn(Optional.empty());
        when(repository.save(any(Plano.class))).thenAnswer(invocacao -> invocacao.getArgument(0));
        when(repository.findAll()).thenReturn(List.of(
            new Plano(CicloAssinatura.MENSAL, new BigDecimal("10.50")),
            new Plano(CicloAssinatura.TRIMESTRAL, new BigDecimal("28.50")),
            new Plano(CicloAssinatura.ANUAL, new BigDecimal("90.00"))
        ));

        service.atualizar(new PlanosAdminRequest(
            new BigDecimal("10.50"),
            new BigDecimal("28.50"),
            new BigDecimal("90.00")
        ));

        verify(repository, org.mockito.Mockito.times(3)).save(any(Plano.class));
    }
}
