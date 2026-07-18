package br.com.minhalista.admin;

import java.util.List;
import java.util.UUID;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService service;

    public AdminController(AdminService service) {
        this.service = service;
    }

    @GetMapping("/resumo")
    public ResumoAdminResponse resumo() {
        return service.resumo();
    }

    @GetMapping("/usuarios")
    public List<UsuarioAdminResponse> usuarios() {
        return service.usuarios();
    }

    @PostMapping("/usuarios/cortesia")
    public UsuarioAdminResponse concederCortesia(@Valid @RequestBody CortesiaRequest request) {
        return service.concederCortesia(request);
    }

    @PatchMapping("/usuarios/{id}/bloqueio")
    public UsuarioAdminResponse alternarBloqueio(@PathVariable UUID id) {
        return service.alternarBloqueio(id);
    }
}
