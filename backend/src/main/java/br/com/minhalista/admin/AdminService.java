package br.com.minhalista.admin;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.minhalista.assinatura.Assinatura;
import br.com.minhalista.assinatura.AssinaturaRepository;
import br.com.minhalista.assinatura.AssinaturaValidadeService;
import br.com.minhalista.assinatura.CicloAssinatura;
import br.com.minhalista.assinatura.StatusAssinatura;
import br.com.minhalista.common.RegraNegocioException;
import br.com.minhalista.lista.ItemListaRepository;
import br.com.minhalista.lista.ListaCompraRepository;
import br.com.minhalista.mercado.MercadoRepository;
import br.com.minhalista.scraper.ExecucaoScraperRepository;
import br.com.minhalista.usuario.TipoAcesso;
import br.com.minhalista.usuario.Usuario;
import br.com.minhalista.usuario.UsuarioRepository;

@Service
public class AdminService {

    private final UsuarioRepository usuarioRepository;
    private final AssinaturaRepository assinaturaRepository;
    private final AssinaturaValidadeService assinaturaValidadeService;
    private final ListaCompraRepository listaRepository;
    private final ItemListaRepository itemRepository;
    private final MercadoRepository mercadoRepository;
    private final ExecucaoScraperRepository execucaoRepository;
    private final HistoricoAcessoRepository historicoRepository;

    public AdminService(
        UsuarioRepository usuarioRepository,
        AssinaturaRepository assinaturaRepository,
        AssinaturaValidadeService assinaturaValidadeService,
        ListaCompraRepository listaRepository,
        ItemListaRepository itemRepository,
        MercadoRepository mercadoRepository,
        ExecucaoScraperRepository execucaoRepository,
        HistoricoAcessoRepository historicoRepository
    ) {
        this.usuarioRepository = usuarioRepository;
        this.assinaturaRepository = assinaturaRepository;
        this.assinaturaValidadeService = assinaturaValidadeService;
        this.listaRepository = listaRepository;
        this.itemRepository = itemRepository;
        this.mercadoRepository = mercadoRepository;
        this.execucaoRepository = execucaoRepository;
        this.historicoRepository = historicoRepository;
    }

    @Transactional
    public ResumoAdminResponse resumo() {
        assinaturaValidadeService.sincronizarAssinaturasExpiradas();
        List<UsuarioAdminResponse> usuarios = usuarioRepository
            .findAllByOrderByCriadoEmDesc()
            .stream()
            .map(this::respostaUsuario)
            .toList();

        long usuariosFree = contarClassificacao(usuarios, "FREE");
        long usuariosPagantes = contarClassificacao(usuarios, "PAGANTE");
        long usuariosCortesia = contarClassificacao(usuarios, "CORTESIA");
        long usuariosPremiumManual =
            contarClassificacao(usuarios, "PREMIUM_MANUAL");
        long usuariosInativos = contarClassificacao(usuarios, "INATIVO");

        return new ResumoAdminResponse(
            usuarios.size(),
            usuariosFree,
            usuariosPagantes + usuariosPremiumManual,
            usuariosCortesia,
            usuariosPremiumManual,
            usuariosInativos,
            assinaturaRepository.countByCicloAndStatus(CicloAssinatura.MENSAL, StatusAssinatura.ATIVA),
            assinaturaRepository.countByCicloAndStatus(CicloAssinatura.TRIMESTRAL, StatusAssinatura.ATIVA),
            assinaturaRepository.countByCicloAndStatus(CicloAssinatura.ANUAL, StatusAssinatura.ATIVA),
            listaRepository.count(),
            itemRepository.count(),
            mercadoRepository.count(),
            execucaoRepository.count()
        );
    }

    private long contarClassificacao(
        List<UsuarioAdminResponse> usuarios,
        String classificacao
    ) {
        return usuarios.stream()
            .filter(usuario -> classificacao.equals(usuario.classificacaoAcesso()))
            .count();
    }

    @Transactional
    public List<UsuarioAdminResponse> usuarios() {
        assinaturaValidadeService.sincronizarAssinaturasExpiradas();
        return usuarioRepository.findAllByOrderByCriadoEmDesc().stream()
            .map(this::respostaUsuario)
            .toList();
    }

    @Transactional
    public AlterarAcessoResponse concederCortesia(
        CortesiaRequest request,
        String administradorEmail
    ) {
        Usuario usuario = usuarioRepository
            .findByEmailIgnoreCase(request.email().trim().toLowerCase(Locale.ROOT))
            .orElseThrow(() -> new RegraNegocioException(HttpStatus.NOT_FOUND, "Usuário não encontrado."));

        return alterarAcesso(
            usuario,
            new AlterarAcessoRequest(
                TipoAcesso.CORTESIA,
                request.dias(),
                request.motivo(),
                request.confirmarAssinaturaAtiva()
            ),
            administradorEmail
        );
    }

    @Transactional
    public AlterarAcessoResponse alterarAcesso(
        UUID usuarioId,
        AlterarAcessoRequest request,
        String administradorEmail
    ) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
            .orElseThrow(() -> new RegraNegocioException(HttpStatus.NOT_FOUND, "Usuário não encontrado."));

        return alterarAcesso(usuario, request, administradorEmail);
    }

    @Transactional(readOnly = true)
    public List<HistoricoAcessoResponse> auditoriaAcessos() {
        return historicoRepository.findTop100ByOrderByCriadoEmDesc().stream()
            .map(HistoricoAcessoResponse::de)
            .toList();
    }

    @Transactional
    public LimparAuditoriaResponse limparAuditoriaAcessos() {
        int registrosRemovidos = historicoRepository.limparTodos();

        String mensagem = registrosRemovidos == 1
            ? "1 registro de auditoria removido."
            : registrosRemovidos + " registros de auditoria removidos.";

        return new LimparAuditoriaResponse(registrosRemovidos, mensagem);
    }

    private AlterarAcessoResponse alterarAcesso(
        Usuario usuario,
        AlterarAcessoRequest request,
        String administradorEmail
    ) {
        assinaturaValidadeService.sincronizarUsuario(usuario);
        TipoAcesso acessoNovo = request.tipoAcesso();
        TipoAcesso acessoAnterior = usuario.getTipoAcesso();
        Optional<Assinatura> assinatura = assinaturaRepository
            .findFirstByUsuarioIdAndStatusAndVenceEmAfterOrderByVenceEmDesc(
                usuario.getId(),
                StatusAssinatura.ATIVA,
                Instant.now()
            );
        boolean assinaturaAtiva = assinatura.isPresent();

        if (assinaturaAtiva
            && acessoNovo != TipoAcesso.PREMIUM
            && !request.confirmarAssinaturaAtiva()) {
            throw new RegraNegocioException(
                HttpStatus.CONFLICT,
                "Este usuário possui uma assinatura paga ativa. Confirme a alteração manual para continuar. A cobrança não será cancelada automaticamente."
            );
        }

        if (acessoNovo == TipoAcesso.CORTESIA) {
            Integer dias = request.diasCortesia();

            if (dias == null || dias < 1 || dias > 3650) {
                throw new RegraNegocioException(
                    HttpStatus.BAD_REQUEST,
                    "Informe uma cortesia entre 1 e 3650 dias."
                );
            }

            usuario.setCortesiaAte(Instant.now().plus(dias, ChronoUnit.DAYS));
        } else {
            usuario.setCortesiaAte(null);
        }

        usuario.setTipoAcesso(acessoNovo);
        usuarioRepository.save(usuario);

        historicoRepository.save(new HistoricoAcessoUsuario(
            usuario.getId(),
            usuario.getEmail(),
            administradorEmail,
            acessoAnterior,
            acessoNovo,
            request.motivo().trim(),
            assinaturaAtiva
        ));

        String mensagem = assinaturaAtiva && acessoNovo != TipoAcesso.PREMIUM
            ? "Acesso alterado manualmente. A assinatura paga continua registrada e não foi cancelada no provedor."
            : "Tipo de acesso atualizado com sucesso.";

        return new AlterarAcessoResponse(
            respostaUsuario(usuario),
            assinaturaAtiva,
            mensagem
        );
    }

    private UsuarioAdminResponse respostaUsuario(Usuario usuario) {
        Assinatura assinatura = assinaturaRepository
            .findFirstByUsuarioIdAndStatusAndVenceEmAfterOrderByVenceEmDesc(
                usuario.getId(),
                StatusAssinatura.ATIVA,
                Instant.now()
            )
            .orElse(null);

        return UsuarioAdminResponse.deComAssinatura(usuario, assinatura);
    }

    @Transactional
    public UsuarioAdminResponse alternarBloqueio(UUID id) {
        Usuario usuario = usuarioRepository.findById(id)
            .orElseThrow(() -> new RegraNegocioException(HttpStatus.NOT_FOUND, "Usuário não encontrado."));
        usuario.setAtivo(!usuario.isAtivo());
        usuarioRepository.save(usuario);
        return respostaUsuario(usuario);
    }
}
