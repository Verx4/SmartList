package br.com.minhalista.admin;

public record ResumoAdminResponse(
    long totalUsuarios,
    long usuariosFree,
    long usuariosPremium,
    long usuariosCortesia,
    long assinaturasMensais,
    long assinaturasTrimestrais,
    long assinaturasAnuais,
    long totalListas,
    long totalProdutos,
    long totalSupermercados,
    long totalExecucoesScraper
) {
}
