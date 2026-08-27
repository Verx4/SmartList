package br.com.minhalista.preco;

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

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

@RestController
@RequestMapping("/api/admin/coleta-precos")
public class AdminPrecoController {
    private final AdminPrecoService service;
    public AdminPrecoController(AdminPrecoService service) { this.service = service; }

    @GetMapping("/resumo") public AdminPrecoService.ResumoResponse resumo() { return service.resumo(); }
    @GetMapping("/filtros") public AdminPrecoService.FiltrosResponse filtros() { return service.filtros(); }

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

    private AdminPrecoService.Filtro filtro(String busca, String categoria, String estado, String cidade, String mercado, OrigemPreco origem, Instant inicio, Instant fim) {
        return new AdminPrecoService.Filtro(busca, categoria, estado, cidade, mercado, origem, inicio, fim);
    }
    public record CategoriaRequest(@NotBlank String categoria) {}
}