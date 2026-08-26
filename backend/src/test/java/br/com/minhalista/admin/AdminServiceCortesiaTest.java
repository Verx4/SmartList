package br.com.minhalista.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import br.com.minhalista.assinatura.AssinaturaRepository;
import br.com.minhalista.assinatura.AssinaturaValidadeService;
import br.com.minhalista.assinatura.StatusAssinatura;
import br.com.minhalista.common.RegraNegocioException;
import br.com.minhalista.lista.ItemListaRepository;
import br.com.minhalista.lista.ListaCompraRepository;
import br.com.minhalista.mercado.MercadoRepository;
import br.com.minhalista.scraper.ExecucaoScraperRepository;
import br.com.minhalista.usuario.TipoAcesso;
import br.com.minhalista.usuario.Usuario;
import br.com.minhalista.usuario.UsuarioRepository;

@ExtendWith(MockitoExtension.class)
class AdminServiceCortesiaTest {

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
    void deveConcederCortesiaPorEmailNormalizado() {
        Usuario usuario = new Usuario();
        usuario.setNome("Cliente Teste");
        usuario.setEmail("cliente@teste.com");
        usuario.setTipoAcesso(TipoAcesso.FREE);
        usuario.setAtivo(true);

        when(usuarioRepository.findByEmailIgnoreCase("cliente@teste.com"))
            .thenReturn(Optional.of(usuario));
        when(assinaturaRepository.findFirstByUsuarioIdAndStatusAndVenceEmAfterOrderByVenceEmDesc(
            isNull(),
            eq(StatusAssinatura.ATIVA),
            any(Instant.class)
        )).thenReturn(Optional.empty());

        AlterarAcessoResponse resposta = service.concederCortesia(
            new CortesiaRequest(
                " CLIENTE@TESTE.COM ",
                30,
                "Parceria",
                false
            ),
            "admin@teste.com"
        );

        assertEquals(TipoAcesso.CORTESIA, usuario.getTipoAcesso());
        assertNotNull(usuario.getCortesiaAte());
        assertEquals("CORTESIA", resposta.usuario().tipoAcesso());
        verify(usuarioRepository).save(usuario);
        verify(historicoRepository).save(any(HistoricoAcessoUsuario.class));
    }

    @Test
    void deveRecusarCortesiaParaEmailNaoCadastrado() {
        when(usuarioRepository.findByEmailIgnoreCase("ausente@teste.com"))
            .thenReturn(Optional.empty());

        assertThrows(
            RegraNegocioException.class,
            () -> service.concederCortesia(
                new CortesiaRequest(
                    "ausente@teste.com",
                    30,
                    "Parceria",
                    false
                ),
                "admin@teste.com"
            )
        );
    }
}
