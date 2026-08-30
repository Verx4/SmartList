package br.com.minhalista.preco;

import java.security.Principal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import br.com.minhalista.admin.AdminService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

@RestController
@RequestMapping("/api/admin/coleta-precos")
public class AdminPrecoController {
    private final AdminPrecoService service;
    private final AdminService adminService;

    public AdminPrecoController(
        AdminPrecoService service,
        AdminService adminService
    ) {
        this.service = service;
        this.adminService = adminService;
    }

    @GetMapping("/resumo") public AdminPrecoService.ResumoResponse resumo() { return service.resumo(); }
    @GetMapping("/resumo-compras")
    public AdminPrecoService.ResumoComprasResponse resumoCompras() {
        service.sincronizarListasFinalizadas();
        return service.resumoCompras();
    }
    @GetMapping("/filtros") public AdminPrecoService.FiltrosResponse filtros() { return service.filtros(); }
    @GetMapping("/compras/filtros")
    public AdminPrecoService.ComprasFiltrosResponse filtrosCompras(Principal principal) {
        AdminPrecoService.ComprasFiltrosResponse filtros = service.filtrosCompras();
        return podeVerIdentidade(principal)
            ? filtros
            : new AdminPrecoService.ComprasFiltrosResponse(
                filtros.mercados(),
                List.of()
            );
    }

    @GetMapping("/compras")
    public AdminPrecoService.PaginaResponse<AdminPrecoService.CompraResumoResponse> compras(
        @RequestParam(defaultValue = "") String busca,
        @RequestParam(defaultValue = "") String mercado,
        @RequestParam(defaultValue = "") String usuario,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant inicio,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant fim,
        @RequestParam(defaultValue = "0") int pagina,
        @RequestParam(defaultValue = "20") int tamanho,
        Principal principal
    ) {
        service.sincronizarListasFinalizadas();
        AdminPrecoService.PaginaResponse<AdminPrecoService.CompraResumoResponse> paginaCompras =
            service.compras(busca, mercado, usuario, inicio, fim, pagina, tamanho);
        if (podeVerIdentidade(principal)) {
            return paginaCompras;
        }
        return new AdminPrecoService.PaginaResponse<>(
            paginaCompras.conteudo().stream()
                .map(this::ocultarIdentidade)
                .toList(),
            paginaCompras.pagina(),
            paginaCompras.tamanho(),
            paginaCompras.totalElementos(),
            paginaCompras.totalPaginas(),
            paginaCompras.temProxima(),
            paginaCompras.temAnterior()
        );
    }

    @GetMapping("/compras/{compraId}")
    public AdminPrecoService.CompraDetalheResponse compra(
        @PathVariable String compraId,
        Principal principal
    ) {
        AdminPrecoService.CompraDetalheResponse compra = service.compra(compraId);
        return podeVerIdentidade(principal)
            ? compra
            : ocultarIdentidade(compra);
    }

    @GetMapping("/produtos")
    public AdminPrecoService.PaginaResponse<AdminPrecoService.ProdutoResumoResponse> produtos(
        @RequestParam(defaultValue = "") String busca, @RequestParam(defaultValue = "") String categoria,
        @RequestParam(defaultValue = "") String estado, @RequestParam(defaultValue = "") String cidade,
        @RequestParam(defaultValue = "") String mercado, @RequestParam(required = false) OrigemPreco origem,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant inicio,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant fim,
        @RequestParam(defaultValue = "0") int pagina, @RequestParam(defaultValue = "20") int tamanho) {
        return service.produtos(filtro(busca, categoria, estado, cidade, mercado, origem, inicio, fim), pagina, tamanho);
    }

    @GetMapping("/observacoes")
    public AdminPrecoService.PaginaResponse<AdminPrecoService.ObservacaoResponse> observacoes(
        @RequestParam(required = false) UUID produtoId, @RequestParam(defaultValue = "") String busca,
        @RequestParam(defaultValue = "") String categoria, @RequestParam(defaultValue = "") String estado,
        @RequestParam(defaultValue = "") String cidade, @RequestParam(defaultValue = "") String mercado,
        @RequestParam(required = false) OrigemPreco origem,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant inicio,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant fim,
        @RequestParam(defaultValue = "0") int pagina, @RequestParam(defaultValue = "20") int tamanho) {
        return service.observacoes(filtro(busca, categoria, estado, cidade, mercado, origem, inicio, fim), produtoId, pagina, tamanho);
    }

    @GetMapping("/produtos/{id}") public AdminPrecoService.ProdutoDetalheResponse produto(@PathVariable UUID id) { return service.produto(id); }

    @PatchMapping("/produtos/{id}/categoria")
    public AdminPrecoService.ProdutoResumoResponse corrigirCategoria(@PathVariable UUID id, @Valid @RequestBody CategoriaRequest request) {
        return service.corrigirCategoria(id, request.categoria());
    }

    @DeleteMapping("/observacoes/{id}")
    public ResponseEntity<Void> excluirObservacao(@PathVariable UUID id) {
        service.excluirObservacao(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/analises/estados") public List<AdminPrecoService.AnaliseResponse> estados() { return service.analiseEstados(); }
    @GetMapping("/analises/mercados") public List<AdminPrecoService.AnaliseResponse> mercados() { return service.analiseMercados(); }

    private boolean podeVerIdentidade(Principal principal) {
        return principal != null && adminService.isFundador(principal.getName());
    }

    private AdminPrecoService.CompraResumoResponse ocultarIdentidade(
        AdminPrecoService.CompraResumoResponse compra
    ) {
        return new AdminPrecoService.CompraResumoResponse(
            compra.compraId(),
            null,
            null,
            compra.mercado(),
            compra.cidade(),
            compra.estado(),
            compra.realizadaEm(),
            compra.totalItens(),
            compra.valorTotal()
        );
    }

    private AdminPrecoService.CompraDetalheResponse ocultarIdentidade(
        AdminPrecoService.CompraDetalheResponse compra
    ) {
        return new AdminPrecoService.CompraDetalheResponse(
            compra.compraId(),
            null,
            null,
            compra.mercado(),
            compra.cidade(),
            compra.estado(),
            compra.realizadaEm(),
            compra.totalItens(),
            compra.valorTotal(),
            compra.itens().stream().map(this::ocultarIdentidade).toList()
        );
    }

    private AdminPrecoService.ObservacaoResponse ocultarIdentidade(
        AdminPrecoService.ObservacaoResponse item
    ) {
        return new AdminPrecoService.ObservacaoResponse(
            item.id(), item.produtoId(), item.produto(), item.categoria(),
            item.nomeOriginal(), item.quantidade(), item.unidade(),
            item.precoUnitario(), item.subtotal(), item.mercado(),
            item.cidade(), item.estado(), item.realizadaEm(), item.origem(),
            null, null, item.compraId(), item.itemId(), item.criadoEm()
        );
    }

    private AdminPrecoService.Filtro filtro(String busca, String categoria, String estado, String cidade, String mercado, OrigemPreco origem, Instant inicio, Instant fim) {
        return new AdminPrecoService.Filtro(busca, categoria, estado, cidade, mercado, origem, inicio, fim);
    }
    public record CategoriaRequest(@NotBlank String categoria) {}
}
