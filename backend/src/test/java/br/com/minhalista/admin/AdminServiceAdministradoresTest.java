package br.com.minhalista.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.UUID;

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
import br.com.minhalista.usuario.Perfil;
import br.com.minhalista.usuario.Usuario;
import br.com.minhalista.usuario.UsuarioRepository;

@ExtendWith(MockitoExtension.class)
class AdminServiceAdministradoresTest {

    @Mock UsuarioRepository usuarioRepository;
    @Mock AssinaturaRepository assinaturaRepository;
    @Mock AssinaturaValidadeService assinaturaValidadeService;
    @Mock ListaCompraRepository listaRepository;
    @Mock ItemListaRepository itemRepository;
    @Mock MercadoRepository mercadoRepository;
    @Mock ExecucaoScraperRepository execucaoRepository;
    @Mock HistoricoAcessoRepository historicoRepository;

    @InjectMocks
    private AdminService service;

    @Test
    void deveConcederPerfilAdminParaContaExistente() {
        Usuario usuario = usuario("novo@smartlist.com", Perfil.USUARIO);
        when(usuarioRepository.findByEmailIgnoreCase("novo@smartlist.com"))
            .thenReturn(Optional.of(usuario));
        when(usuarioRepository.save(any(Usuario.class)))
            .thenAnswer(invocacao -> invocacao.getArgument(0));

        service.concederAcessoAdministrador(
            "NOVO@smartlist.com",
            "smartlistevx@gmail.com"
        );

        assertEquals(Perfil.ADMIN, usuario.getPerfil());
        verify(usuarioRepository).save(usuario);
    }

    @Test
    void deveRevogarPerfilSemRemoverAConta() {
        UUID id = UUID.randomUUID();
        Usuario usuario = usuario("fundador@smartlist.com", Perfil.ADMIN);
        org.springframework.test.util.ReflectionTestUtils.setField(usuario, "id", id);
        when(usuarioRepository.findById(id)).thenReturn(Optional.of(usuario));
        when(usuarioRepository.countByPerfil(Perfil.ADMIN)).thenReturn(2L);

        service.revogarAcessoAdministrador(id, "outro-admin@smartlist.com");

        assertEquals(Perfil.USUARIO, usuario.getPerfil());
        verify(usuarioRepository).save(usuario);
    }

    private Usuario usuario(String email, Perfil perfil) {
        Usuario usuario = new Usuario();
        usuario.setNome("Usuário de teste");
        usuario.setEmail(email);
        usuario.setPerfil(perfil);
        return usuario;
    }
}
