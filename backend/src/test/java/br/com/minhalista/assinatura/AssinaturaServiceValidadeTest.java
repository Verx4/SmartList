package br.com.minhalista.assinatura;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import br.com.minhalista.usuario.TipoAcesso;
import br.com.minhalista.usuario.Usuario;
import br.com.minhalista.usuario.UsuarioService;

@ExtendWith(MockitoExtension.class)
class AssinaturaServiceValidadeTest {

    @Mock
    private AssinaturaRepository repository;

    @Mock
    private UsuarioService usuarioService;

    private AssinaturaService service;
    private Usuario usuario;

    @BeforeEach
    void preparar() {
        service = new AssinaturaService(repository, usuarioService);
        usuario = new Usuario();
        ReflectionTestUtils.setField(usuario, "id", UUID.randomUUID());
        usuario.setTipoAcesso(TipoAcesso.PREMIUM);
    }

    @Test
    void compraAnualPreservaValidadeRestanteEAdicionaDozeMesesDeCalendario() {
        Instant validadeAtual = Instant.parse("2027-09-18T12:00:00Z");
        Assinatura atual = assinatura(CicloAssinatura.MENSAL, StatusAssinatura.ATIVA);
        atual.setVenceEm(validadeAtual);
        Assinatura nova = assinatura(CicloAssinatura.ANUAL, StatusAssinatura.PENDENTE);

        when(repository.buscarPorIdParaAtualizacao(nova.getId()))
            .thenReturn(Optional.of(nova));
        when(repository.findByMercadoPagoPagamentoId("pagamento-anual"))
            .thenReturn(Optional.empty());
        when(usuarioService.obterPorIdParaAtualizacao(usuario.getId()))
            .thenReturn(usuario);
        when(repository.findFirstByUsuarioIdAndStatusOrderByVenceEmDesc(
            usuario.getId(),
            StatusAssinatura.ATIVA
        )).thenReturn(Optional.of(atual));

        service.ativarPremium(nova.getId(), "pagamento-anual");

        assertEquals(
            validadeAtual.atZone(ZoneOffset.UTC).plusMonths(12).toInstant(),
            nova.getVenceEm()
        );
        assertEquals(StatusAssinatura.ATIVA, nova.getStatus());
    }

    @Test
    void pagamentoJaProcessadoNaoAdicionaTempoNovamente() {
        Assinatura existente = assinatura(
            CicloAssinatura.TRIMESTRAL,
            StatusAssinatura.ATIVA
        );
        when(repository.buscarPorIdParaAtualizacao(existente.getId()))
            .thenReturn(Optional.of(existente));
        when(repository.findByMercadoPagoPagamentoId("pagamento-unico"))
            .thenReturn(Optional.of(existente));

        Assinatura resultado = service.ativarPremium(
            existente.getId(),
            "pagamento-unico"
        );

        assertSame(existente, resultado);
        verify(usuarioService, never()).obterPorIdParaAtualizacao(usuario.getId());
    }

    private Assinatura assinatura(
        CicloAssinatura ciclo,
        StatusAssinatura status
    ) {
        Assinatura assinatura = new Assinatura();
        ReflectionTestUtils.setField(assinatura, "id", UUID.randomUUID());
        assinatura.setUsuario(usuario);
        assinatura.setCiclo(ciclo);
        assinatura.setStatus(status);
        assinatura.setValor(ciclo.getValor());
        return assinatura;
    }
}
