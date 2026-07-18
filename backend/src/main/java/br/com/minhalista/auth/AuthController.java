package br.com.minhalista.auth;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.minhalista.auth.dto.AuthResponse;
import br.com.minhalista.auth.dto.CadastroRequest;
import br.com.minhalista.auth.dto.LoginRequest;
import br.com.minhalista.auth.dto.MensagemResponse;
import br.com.minhalista.auth.dto.RecuperarSenhaRequest;
import br.com.minhalista.auth.dto.UsuarioResponse;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService service;

    public AuthController(AuthService service) {
        this.service = service;
    }

    @PostMapping("/cadastro")
    public ResponseEntity<UsuarioResponse> cadastrar(@Valid @RequestBody CadastroRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.cadastrar(request));
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return service.login(request);
    }

    @PostMapping("/recuperar-senha")
    public MensagemResponse recuperarSenha(@Valid @RequestBody RecuperarSenhaRequest request) {
        return new MensagemResponse(
            "Se o e-mail estiver cadastrado, as instruções de recuperação serão enviadas."
        );
    }
}
