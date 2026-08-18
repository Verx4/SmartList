package br.com.minhalista.pagamento;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class CpfValidatorTest {

    @Test
    void aceitaCpfValidoComOuSemFormatacao() {
        assertTrue(CpfValidator.valido("52998224725"));
        assertTrue(CpfValidator.valido("529.982.247-25"));
        assertEquals("52998224725", CpfValidator.normalizar("529.982.247-25"));
    }

    @Test
    void rejeitaCpfIncompletoRepetidoOuComDigitoInvalido() {
        assertFalse(CpfValidator.valido(null));
        assertFalse(CpfValidator.valido("123"));
        assertFalse(CpfValidator.valido("111.111.111-11"));
        assertFalse(CpfValidator.valido("529.982.247-24"));
    }
}

