package br.com.minhalista.sugestao;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import br.com.minhalista.usuario.UsuarioRepository;

@ExtendWith(MockitoExtension.class)
class SugestaoServiceTest {

    @Mock
    private SugestaoRepository repository;

    @Mock
    private UsuarioRepository usuarioRepository;

    @InjectMocks
    private SugestaoService service;

    @Test
    void deveSalvarRespostaDoAdministradorNaSugestao() {
        UUID id = UUID.randomUUID();
        Sugestao sugestao = sugestaoDe("cliente@teste.com");
        when(repository.findById(id)).thenReturn(Optional.of(sugestao));
        when(repository.save(any(Sugestao.class))).thenAnswer(invocacao -> invocacao.getArgument(0));

        SugestaoResponse resposta = service.responder(
            id,
            "  Sua solicitação foi atendida.  ",
            "admin@smartlist.com"
        );

        assertEquals("Sua solicitação foi atendida.", resposta.respostaAdmin());
        assertEquals("admin@smartlist.com", sugestao.getRespondidoPor());
        assertNotNull(resposta.respondidoEm());
        verify(repository).save(sugestao);
    }

    @Test
    void deveListarSomenteMensagensDoEmailAutenticado() {
        String email = "cliente@teste.com";
        when(repository.findAllByUsuarioEmailIgnoreCaseOrderByCriadoEmDesc(email))
            .thenReturn(List.of(sugestaoDe(email)));

        List<SugestaoResponse> respostas = service.listarDoUsuario(email);

        assertEquals(1, respostas.size());
        assertEquals(email, respostas.getFirst().usuarioEmail());
        verify(repository).findAllByUsuarioEmailIgnoreCaseOrderByCriadoEmDesc(email);
    }

    @Test
    void deveExcluirMensagemSelecionada() {
        UUID id = UUID.randomUUID();
        Sugestao sugestao = sugestaoDe("cliente@teste.com");
        when(repository.findById(id)).thenReturn(Optional.of(sugestao));

        service.excluir(id);

        verify(repository).delete(sugestao);
    }

    private Sugestao sugestaoDe(String email) {
        Sugestao sugestao = new Sugestao();
        sugestao.setUsuarioNome("Cliente");
        sugestao.setUsuarioEmail(email);
        sugestao.setCategoria("duvidas");
        sugestao.setTitulo("Dúvida sobre a lista");
        sugestao.setDescricao("Como utilizar este recurso?");
        return sugestao;
    }
}
