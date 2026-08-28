package br.com.minhalista.assinatura;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.minhalista.common.RegraNegocioException;

@Service
public class CupomService {

    private static final BigDecimal CEM = new BigDecimal("100");
    private static final BigDecimal CINCO = new BigDecimal("5.00");
    private static final BigDecimal DEZ = new BigDecimal("10.00");

    private final CupomRepository repository;
    private final PlanoService planoService;

    public CupomService(CupomRepository repository, PlanoService planoService) {
        this.repository = repository;
        this.planoService = planoService;
    }

    @Transactional(readOnly = true)
    public List<CupomResponse> listar() {
        return repository.findAllByOrderByCriadoEmDesc()
            .stream()
            .map(CupomResponse::de)
            .toList();
    }

    @Transactional
    public CupomResponse salvar(CupomAdminRequest request) {
        String codigo = normalizar(request.codigo());
        BigDecimal percentualPermitido = percentualDoCodigo(codigo);
        CicloAssinatura cicloPermitido = cicloDoCodigo(codigo);

        if (request.ciclo() == CicloAssinatura.ANUAL) {
            throw new RegraNegocioException(
                HttpStatus.BAD_REQUEST,
                "O Plano Anual não aceita cupom."
            );
        }

        if (request.ciclo() != cicloPermitido) {
            throw new RegraNegocioException(
                HttpStatus.BAD_REQUEST,
                cicloPermitido == CicloAssinatura.MENSAL
                    ? "Códigos terminados em 5 só podem ser cadastrados para o Plano Mensal."
                    : "Códigos terminados em 10 só podem ser cadastrados para o Plano Trimestral."
            );
        }

        Cupom cupom = repository.findByCodigoIgnoreCase(codigo)
            .orElseGet(Cupom::new);
        cupom.setCodigo(codigo);
        cupom.setPercentualDesconto(percentualPermitido);
        cupom.setCiclo(cicloPermitido);
        cupom.setAtivo(request.ativo());
        return CupomResponse.de(repository.save(cupom));
    }

    @Transactional
    public void excluir(UUID id) {
        if (!repository.existsById(id)) {
            throw new RegraNegocioException(HttpStatus.NOT_FOUND, "Cupom não encontrado.");
        }
        repository.deleteById(id);
    }

    @Transactional
    public CupomAplicacaoResponse aplicar(String codigoInformado, CicloAssinatura ciclo) {
        String codigo = normalizar(codigoInformado);
        BigDecimal percentual = percentualDoCodigo(codigo);
        CicloAssinatura cicloPermitido = cicloDoCodigo(codigo);
        Cupom cupom = repository.findByCodigoIgnoreCase(codigo)
            .filter(Cupom::isAtivo)
            .orElseThrow(() -> new RegraNegocioException(
                HttpStatus.BAD_REQUEST,
                "Cupom inválido ou não autorizado. Cadastre e ative o código no painel ADM."
            ));

        if (ciclo != cicloPermitido || cupom.getCiclo() != cicloPermitido) {
            throw new RegraNegocioException(
                HttpStatus.BAD_REQUEST,
                "Este cupom não é válido para o plano selecionado."
            );
        }

        BigDecimal valorOriginal = planoService.valorVigente(ciclo)
            .setScale(2, RoundingMode.HALF_UP);

        BigDecimal desconto = valorOriginal
            .multiply(percentual)
            .divide(CEM, 2, RoundingMode.HALF_UP);
        BigDecimal total = valorOriginal.subtract(desconto).setScale(2, RoundingMode.HALF_UP);

        return new CupomAplicacaoResponse(
            codigo,
            percentual,
            valorOriginal,
            desconto,
            total,
            cicloPermitido,
            true
        );
    }

    private BigDecimal percentualDoCodigo(String codigo) {
        if (!codigo.matches("[A-Z0-9_-]{1,30}")) {
            throw new RegraNegocioException(
                HttpStatus.BAD_REQUEST,
                "Cupom inválido. Use letras, números, hífen ou sublinhado."
            );
        }

        // Mantém a precedência explícita da regra de 10% antes da regra de 5%.
        if (codigo.endsWith("10")) {
            return DEZ;
        }

        if (codigo.endsWith("5")) {
            return CINCO;
        }

        throw new RegraNegocioException(
            HttpStatus.BAD_REQUEST,
            "Cupom inválido. O código deve terminar em 5 ou 10."
        );
    }

    private CicloAssinatura cicloDoCodigo(String codigo) {
        return codigo.endsWith("10")
            ? CicloAssinatura.TRIMESTRAL
            : CicloAssinatura.MENSAL;
    }

    private String normalizar(String codigo) {
        return String.valueOf(codigo == null ? "" : codigo)
            .trim()
            .toUpperCase(Locale.ROOT);
    }
}
