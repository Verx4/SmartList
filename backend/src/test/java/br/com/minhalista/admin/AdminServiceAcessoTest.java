package br.com.minhalista.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import br.com.minhalista.assinatura.Assinatura;
import br.com.minhalista.assinatura.AssinaturaRepository;
import br.com.minhalista.assinatura.CicloAssinatura;
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
class AdminServiceAcessoTest {

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private AssinaturaRepository assinaturaRepository;

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

    private UUID usuarioId;
    private Usuario usuario;

    @BeforeEach
    void preparar() {
        usuarioId = UUID.randomUUID();
        usuario = new Usuario();
        usuario.setNome("Cliente Teste");
        usuario.setEmail("cliente@teste.com");
        usuario.setTipoAcesso(TipoAcesso.FREE);
        usuario.setAtivo(true);

        when(usuarioRepository.findById(usuarioId)).thenReturn(Optional.of(usuario));
    }

    @Test
    void deveConcederPremiumManualESalvarAuditoria() {
        when(assinaturaRepository.findFirstByUsuarioIdAndStatusOrderByVenceEmDesc(
            null,
            StatusAssinatura.ATIVA
        )).thenReturn(Optional.empty());

        AlterarAcessoResponse resposta = service.alterarAcesso(
            usuarioId,
            new AlterarAcessoRequest(
                TipoAcesso.PREMIUM,
                null,
                "Atendimento autorizado",
                false
            ),
            "admin@teste.com"
        );

        assertEquals(TipoAcesso.PREMIUM, usuario.getTipoAcesso());
        assertNull(usuario.getCortesiaAte());
        assertEquals("PREMIUM", resposta.usuario().tipoAcesso());
        verify(historicoRepository).save(any(HistoricoAcessoUsuario.class));
    }

    @Test
    void deveExigirConfirmacaoParaRemoverPremiumComAssinaturaAtiva() {
        Assinatura assinatura = assinaturaAtiva();
        when(assinaturaRepository.findFirstByUsuarioIdAndStatusOrderByVenceEmDesc(
            null,
            StatusAssinatura.ATIVA
        )).thenReturn(Optional.of(assinatura));
        usuario.setTipoAcesso(TipoAcesso.PREMIUM);

        assertThrows(
            RegraNegocioException.class,
            () -> service.alterarAcesso(
                usuarioId,
                new AlterarAcessoRequest(
                    TipoAcesso.FREE,
                    null,
                    "Solicitação administrativa",
                    false
                ),
                "admin@teste.com"
            )
        );

        assertEquals(TipoAcesso.PREMIUM, usuario.getTipoAcesso());
        verify(historicoRepository, never()).save(any());
    }

    @Test
    void devePermitirFreeAposConfirmacaoMesmoComAssinaturaAtiva() {
        Assinatura assinatura = assinaturaAtiva();
        when(assinaturaRepository.findFirstByUsuarioIdAndStatusOrderByVenceEmDesc(
            null,
            StatusAssinatura.ATIVA
        )).thenReturn(Optional.of(assinatura));
        usuario.setTipoAcesso(TipoAcesso.PREMIUM);

        AlterarAcessoResponse resposta = service.alterarAcesso(
            usuarioId,
            new AlterarAcessoRequest(
                TipoAcesso.FREE,
                null,
                "Estorno tratado separadamente",
                true
            ),
            "admin@teste.com"
        );

        assertEquals(TipoAcesso.FREE, usuario.getTipoAcesso());
        assertEquals(true, resposta.assinaturaAtiva());
        verify(historicoRepository).save(any(HistoricoAcessoUsuario.class));
    }

    @Test
    void deveExigirDuracaoValidaParaCortesia() {
        when(assinaturaRepository.findFirstByUsuarioIdAndStatusOrderByVenceEmDesc(
            null,
            StatusAssinatura.ATIVA
        )).thenReturn(Optional.empty());

        assertThrows(
            RegraNegocioException.class,
            () -> service.alterarAcesso(
                usuarioId,
                new AlterarAcessoRequest(
                    TipoAcesso.CORTESIA,
                    null,
                    "Parceria",
                    false
                ),
                "admin@teste.com"
            )
        );
    }

    private Assinatura assinaturaAtiva() {
        Assinatura assinatura = new Assinatura();
        assinatura.setCiclo(CicloAssinatura.MENSAL);
        assinatura.setStatus(StatusAssinatura.ATIVA);
        assinatura.setVenceEm(Instant.now().plusSeconds(3600));
        return assinatura;
    }
}
