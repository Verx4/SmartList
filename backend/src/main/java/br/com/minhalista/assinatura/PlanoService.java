package br.com.minhalista.assinatura;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PlanoService {

    private final PlanoRepository repository;

    public PlanoService(PlanoRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<PlanoResponse> catalogo() {
        Map<CicloAssinatura, BigDecimal> valores = new EnumMap<>(CicloAssinatura.class);
        repository.findAll().forEach(plano -> valores.put(plano.getCiclo(), plano.getValor()));

        return Arrays.stream(CicloAssinatura.values())
            .map(ciclo -> PlanoResponse.de(
                ciclo,
                valores.getOrDefault(ciclo, ciclo.getValor())
            ))
            .toList();
    }

    @Transactional
    public BigDecimal valorVigente(CicloAssinatura ciclo) {
        return repository.findById(ciclo)
            .map(Plano::getValor)
            .orElseGet(() -> repository.save(
                new Plano(ciclo, ciclo.getValor())
            ).getValor());
    }

    @Transactional
    public List<PlanoResponse> atualizar(PlanosAdminRequest request) {
        salvar(CicloAssinatura.MENSAL, request.mensal());
        salvar(CicloAssinatura.TRIMESTRAL, request.trimestral());
        salvar(CicloAssinatura.ANUAL, request.anual());
        return catalogo();
    }

    private void salvar(CicloAssinatura ciclo, BigDecimal valor) {
        Plano plano = repository.findById(ciclo)
            .orElseGet(() -> new Plano(ciclo, valor));
        plano.setValor(valor);
        repository.save(plano);
    }
}
