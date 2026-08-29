package br.com.minhalista.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import br.com.minhalista.assinatura.AssinaturaRepository;
import br.com.minhalista.assinatura.AssinaturaValidadeService;
import br.com.minhalista.lista.ItemListaRepository;
import br.com.minhalista.lista.ListaCompraRepository;
import br.com.minhalista.mercado.MercadoRepository;
import br.com.minhalista.scraper.ExecucaoScraperRepository;
import br.com.minhalista.usuario.Perfil;
import br.com.minhalista.usuario.TipoAcesso;
import br.com.minhalista.usuario.Usuario;
import br.com.minhalista.usuario.UsuarioRepository;

@ExtendWith(MockitoExtension.class)
class AdminServiceDashboardTest {

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

    private Usuario usuario;

    @BeforeEach
    void preparar() {
        usuario = new Usuario();
        ReflectionTestUtils.setField(usuario, "id", UUID.randomUUID());
        usuario.setNome("Administrador");
        usuario.setEmail("admin@example.com");
        usuario.setPerfil(Perfil.ADMIN);
        usuario.setTipoAcesso(TipoAcesso.FREE);
        usuario.setAtivo(true);
    }

    @Test
    void deveListarUsuariosMesmoQuandoAssinaturasFalharem() {
        doThrow(new IllegalStateException("Falha simulada na sincronização"))
            .when(assinaturaValidadeService).sincronizarAssinaturasExpiradas();
        when(usuarioRepository.findAllByOrderByCriadoEmDesc())
            .thenReturn(List.of(usuario));
        when(assinaturaRepository
            .findFirstByUsuarioIdAndStatusAndVenceEmAfterOrderByVenceEmDesc(
                any(),
                any(),
                any()
            ))
            .thenThrow(new IllegalStateException("Falha simulada na consulta"));

        List<UsuarioAdminResponse> resposta = service.usuarios();

        assertEquals(1, resposta.size());
        assertEquals("admin@example.com", resposta.getFirst().email());
        assertEquals("FREE", resposta.getFirst().classificacaoAcesso());
        assertFalse(resposta.getFirst().assinaturaAtiva());
    }

    @Test
    void deveCarregarResumoMesmoQuandoContagemDeAssinaturasFalhar() {
        when(usuarioRepository.findAllByOrderByCriadoEmDesc())
            .thenReturn(List.of(usuario));
        when(assinaturaRepository
            .findFirstByUsuarioIdAndStatusAndVenceEmAfterOrderByVenceEmDesc(
                any(),
                any(),
                any()
            ))
            .thenReturn(Optional.empty());
        when(assinaturaRepository.countByCicloAndStatus(any(), any()))
            .thenThrow(new IllegalStateException("Falha simulada na contagem"));
        when(listaRepository.count()).thenReturn(3L);
        when(itemRepository.count()).thenReturn(12L);
        when(mercadoRepository.count()).thenReturn(2L);
        when(execucaoRepository.count()).thenReturn(4L);

        ResumoAdminResponse resposta = service.resumo();

        assertEquals(1, resposta.totalUsuarios());
        assertEquals(1, resposta.usuariosFree());
        assertEquals(0, resposta.assinaturasMensais());
        assertEquals(0, resposta.assinaturasTrimestrais());
        assertEquals(0, resposta.assinaturasAnuais());
        assertEquals(3, resposta.totalListas());
        assertEquals(12, resposta.totalProdutos());
        assertEquals(2, resposta.totalSupermercados());
        assertEquals(4, resposta.totalExecucoesScraper());
    }
}
