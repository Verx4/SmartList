package br.com.minhalista.admin;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.minhalista.assinatura.AssinaturaRepository;
import br.com.minhalista.assinatura.CicloAssinatura;
import br.com.minhalista.assinatura.StatusAssinatura;
import br.com.minhalista.common.RegraNegocioException;
import br.com.minhalista.lista.ItemListaRepository;
import br.com.minhalista.mercado.MercadoRepository;
import br.com.minhalista.scraper.ExecucaoScraperRepository;
import br.com.minhalista.usuario.TipoAcesso;
import br.com.minhalista.usuario.Usuario;
import br.com.minhalista.usuario.UsuarioRepository;

@Service
public class AdminService {

    private final UsuarioRepository usuarioRepository;
    private final AssinaturaRepository assinaturaRepository;
    private final ItemListaRepository itemRepository;
    private final MercadoRepository mercadoRepository;
    private final ExecucaoScraperRepository execucaoRepository;

    public AdminService(
        UsuarioRepository usuarioRepository,
        AssinaturaRepository assinaturaRepository,
        ItemListaRepository itemRepository,
        MercadoRepository mercadoRepository,
        ExecucaoScraperRepository execucaoRepository
    ) {
        this.usuarioRepository = usuarioRepository;
        this.assinaturaRepository = assinaturaRepository;
        this.itemRepository = itemRepository;
        this.mercadoRepository = mercadoRepository;
        this.execucaoRepository = execucaoRepository;
    }

    @Transactional(readOnly = true)
    public ResumoAdminResponse resumo() {
        return new ResumoAdminResponse(
            usuarioRepository.count(),
            usuarioRepository.countByTipoAcesso(TipoAcesso.FREE),
            usuarioRepository.countByTipoAcesso(TipoAcesso.PREMIUM),
            usuarioRepository.countByTipoAcesso(TipoAcesso.CORTESIA),
            assinaturaRepository.countByCicloAndStatus(CicloAssinatura.MENSAL, StatusAssinatura.ATIVA),
            assinaturaRepository.countByCicloAndStatus(CicloAssinatura.TRIMESTRAL, StatusAssinatura.ATIVA),
            assinaturaRepository.countByCicloAndStatus(CicloAssinatura.ANUAL, StatusAssinatura.ATIVA),
            itemRepository.count(),
            mercadoRepository.count(),
            execucaoRepository.count()
        );
    }

    @Transactional(readOnly = true)
    public List<UsuarioAdminResponse> usuarios() {
        return usuarioRepository.findAllByOrderByCriadoEmDesc().stream()
            .map(usuario -> UsuarioAdminResponse.de(
                usuario,
                assinaturaRepository
                    .findFirstByUsuarioIdAndStatusOrderByVenceEmDesc(
                        usuario.getId(),
                        StatusAssinatura.ATIVA
                    )
                    .map(assinatura -> assinatura.getCiclo().name())
                    .orElse(null)
            ))
            .toList();
    }

    @Transactional
    public UsuarioAdminResponse concederCortesia(CortesiaRequest request) {
        Usuario usuario = usuarioRepository
            .findByEmailIgnoreCase(request.email().trim().toLowerCase(Locale.ROOT))
            .orElseThrow(() -> new RegraNegocioException(HttpStatus.NOT_FOUND, "Usuário não encontrado."));

        usuario.setTipoAcesso(TipoAcesso.CORTESIA);
        usuario.setCortesiaAte(Instant.now().plus(request.dias(), ChronoUnit.DAYS));
        usuario.setAtivo(true);
        return UsuarioAdminResponse.de(usuarioRepository.save(usuario), null);
    }

    @Transactional
    public UsuarioAdminResponse alternarBloqueio(UUID id) {
        Usuario usuario = usuarioRepository.findById(id)
            .orElseThrow(() -> new RegraNegocioException(HttpStatus.NOT_FOUND, "Usuário não encontrado."));
        usuario.setAtivo(!usuario.isAtivo());
        return UsuarioAdminResponse.de(usuarioRepository.save(usuario), null);
    }
}
