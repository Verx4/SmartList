package br.com.minhalista.admin;

import java.security.Principal;
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

    @GetMapping("/usuarios/auditoria")
    public List<HistoricoAcessoResponse> auditoriaAcessos() {
        return service.auditoriaAcessos();
    }

    @PatchMapping("/usuarios/{id}/acesso")
    public AlterarAcessoResponse alterarAcesso(
        @PathVariable UUID id,
        @Valid @RequestBody AlterarAcessoRequest request,
        Principal principal
    ) {
        return service.alterarAcesso(id, request, principal.getName());
    }

    @PostMapping("/usuarios/cortesia")
    public AlterarAcessoResponse concederCortesia(
        @Valid @RequestBody CortesiaRequest request,
        Principal principal
    ) {
        return service.concederCortesia(request, principal.getName());
    }

    @PatchMapping("/usuarios/{id}/bloqueio")
    public UsuarioAdminResponse alternarBloqueio(@PathVariable UUID id) {
        return service.alternarBloqueio(id);
    }
}
