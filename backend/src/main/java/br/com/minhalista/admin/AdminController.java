package br.com.minhalista.admin;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.minhalista.common.RegraNegocioException;
import br.com.minhalista.pagamento.MercadoPagoService;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService service;
    private final MercadoPagoService mercadoPagoService;

    public AdminController(
        AdminService service,
        MercadoPagoService mercadoPagoService
    ) {
        this.service = service;
        this.mercadoPagoService = mercadoPagoService;
    }

    @GetMapping("/resumo")
    public ResumoAdminResponse resumo() {
        return service.resumo();
    }

    @GetMapping("/usuarios")
    public List<UsuarioAdminResponse> usuarios() {
        return service.usuarios();
    }

    @GetMapping("/administradores")
    public List<AdministradorResponse> administradores() {
        return service.administradores();
    }

    @PostMapping("/administradores")
    public AdministradorResponse concederAcessoAdministrador(
        @Valid @RequestBody AdministradorRequest request
    ) {
        return service.concederAcessoAdministrador(request.email());
    }

    @DeleteMapping("/administradores/{id}")
    public void revogarAcessoAdministrador(
        @PathVariable UUID id,
        Principal principal
    ) {
        service.revogarAcessoAdministrador(id, principal.getName());
    }

    @GetMapping("/usuarios/auditoria")
    public List<HistoricoAcessoResponse> auditoriaAcessos() {
        return service.auditoriaAcessos();
    }

    @DeleteMapping("/usuarios/auditoria")
    public LimparAuditoriaResponse limparAuditoriaAcessos() {
        return service.limparAuditoriaAcessos();
    }

    @PostMapping("/usuarios/auditoria/limpar")
    public LimparAuditoriaResponse limparAuditoriaAcessosViaPost() {
        return service.limparAuditoriaAcessos();
    }

    @GetMapping("/pagamentos/{pagamentoId}/diagnostico")
    public PagamentoDiagnosticoResponse diagnosticoPagamento(
        @PathVariable String pagamentoId
    ) {
        String identificador = pagamentoId == null ? "" : pagamentoId.trim();

        if (!identificador.matches("\\d{6,20}")) {
            throw new RegraNegocioException(
                HttpStatus.BAD_REQUEST,
                "Informe o número da operação exibido pelo Mercado Pago."
            );
        }

        return PagamentoDiagnosticoResponse.de(
            mercadoPagoService.consultarPagamento(identificador)
        );
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
