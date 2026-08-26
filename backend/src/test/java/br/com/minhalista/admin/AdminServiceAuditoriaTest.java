package br.com.minhalista.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import br.com.minhalista.assinatura.AssinaturaRepository;
import br.com.minhalista.assinatura.AssinaturaValidadeService;
import br.com.minhalista.lista.ItemListaRepository;
import br.com.minhalista.lista.ListaCompraRepository;
import br.com.minhalista.mercado.MercadoRepository;
import br.com.minhalista.scraper.ExecucaoScraperRepository;
import br.com.minhalista.usuario.UsuarioRepository;

@ExtendWith(MockitoExtension.class)
class AdminServiceAuditoriaTest {

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private AssinaturaRepository assinaturaRepository;

    @Mock
    private AssinaturaValidadeService assinaturaValidadeService;

    @Mock
    private ListaCompraRepository listaRepository;

    @Mock
    private ItemListaRepository itemRepository;

    @Mock
    private MercadoRepository mercadoRepository;

    @Mock
    private ExecucaoScraperRepository execucaoRepository;

    @Mock
    private HistoricoAcessoRepository historicoRepository;

    @InjectMocks
    private AdminService service;

    @Test
    void deveLimparTodosOsRegistrosDeAuditoria() {
        when(historicoRepository.count()).thenReturn(7L);

        LimparAuditoriaResponse resposta = service.limparAuditoriaAcessos();

        assertEquals(7L, resposta.registrosRemovidos());
        assertEquals("7 registros de auditoria removidos.", resposta.mensagem());
        verify(historicoRepository).deleteAllInBatch();
    }
}
