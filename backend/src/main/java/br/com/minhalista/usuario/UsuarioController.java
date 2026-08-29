package br.com.minhalista.usuario;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.minhalista.auth.dto.UsuarioResponse;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/usuarios")
public class UsuarioController {

    private final UsuarioService service;

    public UsuarioController(UsuarioService service) {
        this.service = service;
    }

    @GetMapping("/me")
    public UsuarioResponse consultarPerfil() {
        return UsuarioResponse.de(service.consultarPerfil());
    }

    @PutMapping("/me")
    public UsuarioResponse atualizarPerfil(
        @Valid @RequestBody AtualizarUsuarioRequest request
    ) {
        return UsuarioResponse.de(service.atualizarPerfil(request));
    }

    @GetMapping("/me/cpf")
    public CpfPerfilResponse consultarCpf() {
        return service.consultarCpf();
    }

    @PutMapping("/me/cpf")
    public CpfPerfilResponse atualizarCpf(
        @Valid @RequestBody AtualizarCpfRequest request
    ) {
        return service.atualizarCpf(request);
    }
}
