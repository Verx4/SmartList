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

    private static final int CONFIGURACAO_ID = 1;

    private final PlanoRepository repository;
    private final ConfiguracaoPlanosRepository configuracaoRepository;

    public PlanoService(
        PlanoRepository repository,
        ConfiguracaoPlanosRepository configuracaoRepository
    ) {
        this.repository = repository;
        this.configuracaoRepository = configuracaoRepository;
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

    @Transactional
    public ConfiguracaoPlanosResponse configuracao() {
        return ConfiguracaoPlanosResponse.de(obterConfiguracao());
    }

    @Transactional
    public ConfiguracaoPlanosResponse atualizarConfiguracao(ConfiguracaoPlanosAdminRequest request) {
        ConfiguracaoPlanos configuracao = obterConfiguracao();
        configuracao.setExibirCupons(request.exibirCupons());
        return ConfiguracaoPlanosResponse.de(configuracaoRepository.save(configuracao));
    }

    private ConfiguracaoPlanos obterConfiguracao() {
        return configuracaoRepository.findById(CONFIGURACAO_ID)
            .orElseGet(() -> configuracaoRepository.save(new ConfiguracaoPlanos(CONFIGURACAO_ID, true)));
    }

    private void salvar(CicloAssinatura ciclo, BigDecimal valor) {
        Plano plano = repository.findById(ciclo)
            .orElseGet(() -> new Plano(ciclo, valor));
        plano.setValor(valor);
        repository.save(plano);
    }
}
