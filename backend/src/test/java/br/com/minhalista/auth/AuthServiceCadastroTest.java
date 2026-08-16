package br.com.minhalista.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import br.com.minhalista.auth.dto.CadastroRequest;
import br.com.minhalista.auth.dto.UsuarioResponse;
import br.com.minhalista.usuario.Usuario;
import br.com.minhalista.usuario.UsuarioRepository;

@ExtendWith(MockitoExtension.class)
class AuthServiceCadastroTest {

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @InjectMocks
    private AuthService service;

    @Test
    void deveSalvarPrimeiroNomeEstadoECidadeInformadosNoCadastro() {
        when(usuarioRepository.existsByEmailIgnoreCase("ana@example.com")).thenReturn(false);
        when(passwordEncoder.encode("segredo123")).thenReturn("senha-codificada");
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(invocacao -> invocacao.getArgument(0));

        UsuarioResponse resposta = service.cadastrar(new CadastroRequest(
            "Ana",
            "pe",
            "Recife",
            "ANA@EXAMPLE.COM",
            "segredo123",
            true,
            false
        ));

        ArgumentCaptor<Usuario> captor = ArgumentCaptor.forClass(Usuario.class);
        verify(usuarioRepository).save(captor.capture());
        Usuario salvo = captor.getValue();

        assertEquals("Ana", salvo.getNome());
        assertEquals("PE", salvo.getEstado());
        assertEquals("Recife", salvo.getCidade());
        assertEquals("ana@example.com", salvo.getEmail());
        assertEquals("PE", resposta.estado());
        assertEquals("Recife", resposta.cidade());
    }
}
