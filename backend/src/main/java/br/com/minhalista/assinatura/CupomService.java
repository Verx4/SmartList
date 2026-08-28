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
        Cupom cupom = repository.findByCodigoIgnoreCase(codigo)
            .orElseGet(Cupom::new);
        cupom.setCodigo(codigo);
        cupom.setPercentualDesconto(
            request.percentualDesconto().setScale(2, RoundingMode.HALF_UP)
        );
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
        BigDecimal valorOriginal = planoService.valorVigente(ciclo)
            .setScale(2, RoundingMode.HALF_UP);
        String codigo = normalizar(codigoInformado);
        Cupom cupom = repository.findByCodigoIgnoreCase(codigo)
            .filter(Cupom::isAtivo)
            .orElseThrow(() -> new RegraNegocioException(
                HttpStatus.BAD_REQUEST,
                "Cupom inválido ou inativo."
            ));
        BigDecimal desconto = valorOriginal
            .multiply(cupom.getPercentualDesconto())
            .divide(CEM, 2, RoundingMode.HALF_UP);
        BigDecimal total = valorOriginal.subtract(desconto).setScale(2, RoundingMode.HALF_UP);

        return new CupomAplicacaoResponse(
            cupom.getCodigo(),
            cupom.getPercentualDesconto(),
            valorOriginal,
            desconto,
            total
        );
    }

    private String normalizar(String codigo) {
        return String.valueOf(codigo == null ? "" : codigo)
            .trim()
            .toUpperCase(Locale.ROOT);
    }
}
