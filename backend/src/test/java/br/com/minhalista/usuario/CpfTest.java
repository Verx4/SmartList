package br.com.minhalista.usuario;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class CpfTest {

    @Test
    void validaCpfComOuSemMascara() {
        assertTrue(Cpf.valido("529.982.247-25"));
        assertTrue(Cpf.valido("52998224725"));
        assertEquals("52998224725", Cpf.somenteDigitos("529.982.247-25"));
    }

    @Test
    void rejeitaCpfInvalidoESequenciaRepetida() {
        assertFalse(Cpf.valido("529.982.247-24"));
        assertFalse(Cpf.valido("111.111.111-11"));
        assertFalse(Cpf.valido("123"));
    }
}
