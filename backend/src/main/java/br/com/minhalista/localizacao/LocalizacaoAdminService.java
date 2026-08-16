package br.com.minhalista.localizacao;

import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.minhalista.usuario.Usuario;
import br.com.minhalista.usuario.UsuarioRepository;

@Service
public class LocalizacaoAdminService {

    private final LocalizacaoUsuarioRepository localizacaoRepository;
    private final UsuarioRepository usuarioRepository;

    public LocalizacaoAdminService(
        LocalizacaoUsuarioRepository localizacaoRepository,
        UsuarioRepository usuarioRepository
    ) {
        this.localizacaoRepository = localizacaoRepository;
        this.usuarioRepository = usuarioRepository;
    }

    @Transactional(readOnly = true)
    public LocalizacaoAdminResponse resumo() {
        Instant agora = Instant.now();
        List<Usuario> usuarios = usuarioRepository.findAllByOrderByCriadoEmDesc();
        List<Usuario> usuariosComLocalidade = usuarios.stream()
            .filter(Usuario::isAtivo)
            .filter(usuario -> preenchido(usuario.getEstado()))
            .filter(usuario -> preenchido(usuario.getCidade()))
            .toList();

        Map<ChaveLocalidade, Long> porLocalidade = new LinkedHashMap<>();
        Map<String, Long> porRede = new LinkedHashMap<>();
        usuariosComLocalidade.forEach(usuario -> {
            ChaveLocalidade chave = new ChaveLocalidade(
                usuario.getEstado(),
                usuario.getCidade()
            );
            porLocalidade.merge(chave, 1L, Long::sum);
        });

        localizacaoRepository.buscarAtivasParaAgregacao(agora).forEach(localizacao -> {
            if (localizacao.getUnidadeConfirmada() != null) {
                porRede.merge(localizacao.getUnidadeConfirmada().getRede(), 1L, Long::sum);
            }
        });

        List<LocalidadeAgregadaResponse> localidades = porLocalidade.entrySet().stream()
            .map(item -> new LocalidadeAgregadaResponse(
                item.getKey().estado(),
                item.getKey().cidade(),
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
            usuariosComLocalidade.size(),
            usuarios.stream()
                .filter(usuario -> usuario.getCriadoEm() != null)
                .filter(usuario -> usuario.getCriadoEm().isAfter(agora.minus(Duration.ofHours(24))))
                .count(),
            localidades,
            redes,
            "Dados agregados de estado e cidade informados no cadastro. O GPS do aparelho não é solicitado."
        );
    }

    private boolean preenchido(String valor) {
        return valor != null && !valor.isBlank();
    }

    private record ChaveLocalidade(String estado, String cidade) {
    }
}
