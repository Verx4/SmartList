package br.com.minhalista.localizacao;

import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LocalizacaoAdminService {

    private final LocalizacaoUsuarioRepository repository;

    public LocalizacaoAdminService(LocalizacaoUsuarioRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public LocalizacaoAdminResponse resumo() {
        Instant agora = Instant.now();
        List<LocalizacaoUsuario> ativas = repository.buscarAtivasParaAgregacao(agora);

        Map<ChaveLocalidade, Long> porLocalidade = new LinkedHashMap<>();
        Map<String, Long> porRede = new LinkedHashMap<>();
        ativas.forEach(localizacao -> {
            ChaveLocalidade chave = new ChaveLocalidade(
                localizacao.getEstado(),
                localizacao.getCidade(),
                localizacao.getBairro()
            );
            porLocalidade.merge(chave, 1L, Long::sum);
            if (localizacao.getUnidadeConfirmada() != null) {
                porRede.merge(localizacao.getUnidadeConfirmada().getRede(), 1L, Long::sum);
            }
        });

        List<LocalidadeAgregadaResponse> localidades = porLocalidade.entrySet().stream()
            .map(item -> new LocalidadeAgregadaResponse(
                item.getKey().estado(),
                item.getKey().cidade(),
                item.getKey().bairro(),
                item.getValue()
            ))
            .sorted(Comparator.comparingLong(LocalidadeAgregadaResponse::usuarios).reversed())
            .limit(500)
            .toList();
        List<RedeConfirmadaResponse> redes = porRede.entrySet().stream()
            .map(item -> new RedeConfirmadaResponse(item.getKey(), item.getValue()))
            .sorted(Comparator.comparingLong(RedeConfirmadaResponse::confirmacoes).reversed())
            .limit(100)
            .toList();

        return new LocalizacaoAdminResponse(
            agora,
            repository.countByLocalidadeExpiraEmAfter(agora),
            repository.countByAtualizadaEmAfter(agora.minus(Duration.ofHours(24))),
            localidades,
            redes,
            "Dados agregados por localidade; coordenadas e identificação individual não são exibidas."
        );
    }

    private record ChaveLocalidade(String estado, String cidade, String bairro) {
    }
}
