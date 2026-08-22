package br.com.minhalista.assinatura;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.minhalista.usuario.TipoAcesso;
import br.com.minhalista.usuario.Usuario;
import br.com.minhalista.usuario.UsuarioRepository;

@Service
public class AssinaturaValidadeService {

    private final AssinaturaRepository assinaturaRepository;
    private final UsuarioRepository usuarioRepository;

    public AssinaturaValidadeService(
        AssinaturaRepository assinaturaRepository,
        UsuarioRepository usuarioRepository
    ) {
        this.assinaturaRepository = assinaturaRepository;
        this.usuarioRepository = usuarioRepository;
    }

    @Scheduled(cron = "0 * * * * *", zone = "America/Fortaleza")
    @Transactional
    public void sincronizarAssinaturasExpiradas() {
        Instant agora = Instant.now();
        List<Assinatura> vencidas = assinaturaRepository
            .findAllByStatusAndVenceEmLessThanEqual(StatusAssinatura.ATIVA, agora);

        Map<UUID, Usuario> usuariosAfetados = new LinkedHashMap<>();

        for (Assinatura assinatura : vencidas) {
            assinatura.setStatus(StatusAssinatura.EXPIRADA);
            Usuario usuario = assinatura.getUsuario();
            usuariosAfetados.put(usuario.getId(), usuario);
        }

        if (vencidas.isEmpty()) {
            return;
        }

        assinaturaRepository.flush();

        for (Usuario usuario : usuariosAfetados.values()) {
            voltarParaFreeSemOutraAssinaturaVigente(usuario, agora);
        }
    }

    @Transactional
    public boolean sincronizarUsuario(Usuario usuario) {
        Instant agora = Instant.now();
        List<Assinatura> vencidas = assinaturaRepository
            .findAllByUsuarioIdAndStatusAndVenceEmLessThanEqual(
                usuario.getId(),
                StatusAssinatura.ATIVA,
                agora
            );

        vencidas.forEach(assinatura -> assinatura.setStatus(StatusAssinatura.EXPIRADA));

        if (vencidas.isEmpty()) {
            return assinaturaRepository.existsByUsuarioIdAndStatusAndVenceEmAfter(
                usuario.getId(),
                StatusAssinatura.ATIVA,
                agora
            );
        }

        assinaturaRepository.flush();
        return voltarParaFreeSemOutraAssinaturaVigente(usuario, agora);
    }

    private boolean voltarParaFreeSemOutraAssinaturaVigente(
        Usuario usuario,
        Instant agora
    ) {
        boolean possuiAssinaturaVigente = assinaturaRepository
            .existsByUsuarioIdAndStatusAndVenceEmAfter(
                usuario.getId(),
                StatusAssinatura.ATIVA,
                agora
            );

        if (!possuiAssinaturaVigente && usuario.getTipoAcesso() == TipoAcesso.PREMIUM) {
            usuario.setTipoAcesso(TipoAcesso.FREE);
            usuarioRepository.save(usuario);
        }

        return possuiAssinaturaVigente;
    }
}
