package br.com.minhalista.admin;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
import br.com.minhalista.usuario.Perfil;
import br.com.minhalista.usuario.Usuario;
import br.com.minhalista.usuario.UsuarioRepository;

@Service
public class AdminService {

    private static final Logger LOGGER = LoggerFactory.getLogger(AdminService.class);
    private static final String EMAIL_FUNDADOR = "smartlistevx@gmail.com";

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

    public ResumoAdminResponse resumo() {
        sincronizarAssinaturasSemBloquearPainel();
        List<UsuarioAdminResponse> usuarios = usuarioRepository
            .findAllByOrderByCriadoEmDesc()
            .stream()
            .filter(usuario -> usuario.getExclusaoSolicitadaEm() == null)
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
            contarAssinaturasAtivas(CicloAssinatura.MENSAL),
            contarAssinaturasAtivas(CicloAssinatura.TRIMESTRAL),
            contarAssinaturasAtivas(CicloAssinatura.ANUAL),
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

    public List<UsuarioAdminResponse> usuarios() {
        sincronizarAssinaturasSemBloquearPainel();
        return usuarioRepository.findAllByOrderByCriadoEmDesc().stream()
            .filter(usuario -> usuario.getExclusaoSolicitadaEm() == null)
            .map(this::respostaUsuario)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<AdministradorResponse> administradores() {
        return usuarioRepository.findAllByPerfilOrderByNomeAsc(Perfil.ADMIN)
            .stream()
            .map(usuario -> AdministradorResponse.de(usuario, isFundador(usuario.getEmail())))
            .toList();
    }

    @Transactional
    public AdministradorResponse concederAcessoAdministrador(
        String email,
        String administradorEmail
    ) {
        if (!isFundador(administradorEmail)) {
            throw new RegraNegocioException(
                HttpStatus.FORBIDDEN,
                "Somente a conta ADM principal pode conceder novos acessos administrativos."
            );
        }

        Usuario usuario = usuarioRepository
            .findByEmailIgnoreCase(email.trim().toLowerCase(Locale.ROOT))
            .orElseThrow(() -> new RegraNegocioException(
                HttpStatus.NOT_FOUND,
                "Nenhuma conta foi encontrada com este e-mail."
            ));

        usuario.setPerfil(Perfil.ADMIN);
        return AdministradorResponse.de(
            usuarioRepository.save(usuario),
            isFundador(usuario.getEmail())
        );
    }

    @Transactional
    public void revogarAcessoAdministrador(UUID usuarioId, String administradorEmail) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
            .orElseThrow(() -> new RegraNegocioException(
                HttpStatus.NOT_FOUND,
                "Administrador não encontrado."
            ));

        if (usuario.getPerfil() != Perfil.ADMIN) {
            throw new RegraNegocioException(
                HttpStatus.BAD_REQUEST,
                "Este usuário não possui acesso administrativo."
            );
        }

        if (isFundador(usuario.getEmail())) {
            throw new RegraNegocioException(
                HttpStatus.FORBIDDEN,
                "O acesso da conta ADM principal não pode ser revogado."
            );
        }

        if (usuario.getEmail().equalsIgnoreCase(administradorEmail)) {
            throw new RegraNegocioException(
                HttpStatus.CONFLICT,
                "Você não pode revogar o próprio acesso administrativo."
            );
        }

        if (usuarioRepository.countByPerfil(Perfil.ADMIN) <= 1) {
            throw new RegraNegocioException(
                HttpStatus.CONFLICT,
                "O painel precisa manter pelo menos um administrador."
            );
        }

        usuario.setPerfil(Perfil.USUARIO);
        usuarioRepository.save(usuario);
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
        Assinatura assinatura = null;

        try {
            assinatura = assinaturaRepository
                .findFirstByUsuarioIdAndStatusAndVenceEmAfterOrderByVenceEmDesc(
                    usuario.getId(),
                    StatusAssinatura.ATIVA,
                    Instant.now()
                )
                .orElse(null);
        } catch (RuntimeException erro) {
            LOGGER.error(
                "Falha ao consultar a assinatura ativa do usuário {} no painel administrativo.",
                usuario.getId(),
                erro
            );
        }

        return UsuarioAdminResponse.deComAssinatura(usuario, assinatura);
    }

    private void sincronizarAssinaturasSemBloquearPainel() {
        try {
            assinaturaValidadeService.sincronizarAssinaturasExpiradas();
        } catch (RuntimeException erro) {
            LOGGER.error(
                "Falha ao sincronizar assinaturas durante a atualização do painel administrativo.",
                erro
            );
        }
    }

    private long contarAssinaturasAtivas(CicloAssinatura ciclo) {
        try {
            return assinaturaRepository.countByCicloAndStatus(
                ciclo,
                StatusAssinatura.ATIVA
            );
        } catch (RuntimeException erro) {
            LOGGER.error(
                "Falha ao contar assinaturas ativas do ciclo {}.",
                ciclo,
                erro
            );
            return 0;
        }
    }

    public boolean isFundador(String email) {
        return email != null && EMAIL_FUNDADOR.equalsIgnoreCase(email.trim());
    }

    @Transactional
    public void excluirContaUsuario(UUID usuarioId, String administradorEmail) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
            .orElseThrow(() -> new RegraNegocioException(
                HttpStatus.NOT_FOUND,
                "Usuário não encontrado."
            ));

        if (isFundador(usuario.getEmail())) {
            throw new RegraNegocioException(
                HttpStatus.FORBIDDEN,
                "A conta ADM principal não pode ser excluída."
            );
        }

        if (usuario.getEmail().equalsIgnoreCase(administradorEmail)) {
            throw new RegraNegocioException(
                HttpStatus.CONFLICT,
                "Você não pode excluir a própria conta."
            );
        }

        if (usuario.getPerfil() == Perfil.ADMIN) {
            throw new RegraNegocioException(
                HttpStatus.FORBIDDEN,
                "Contas administrativas não podem ser excluídas por esta função."
            );
        }

        String identificador = usuario.getId().toString();
        usuario.setNome("Conta excluída");
        usuario.setEmail("excluido-" + identificador + "@anonimo.smartlist");
        usuario.setCpf(null);
        usuario.setTelefone(null);
        usuario.setCidade(null);
        usuario.setEstado(null);
        usuario.setSenhaHash("CONTA_EXCLUIDA_" + identificador);
        usuario.setPerfil(Perfil.USUARIO);
        usuario.setTipoAcesso(TipoAcesso.FREE);
        usuario.setCortesiaAte(null);
        usuario.setAtivo(false);
        usuario.setAceiteMarketing(false);
        usuario.setNotificarPromocoes(false);
        usuario.setNotificarPrecos(false);
        usuario.setExclusaoSolicitadaEm(Instant.now());
        usuarioRepository.save(usuario);

        LOGGER.info(
            "Conta {} excluída e anonimizada pelo administrador {}.",
            usuarioId,
            administradorEmail
        );
    }

    @Transactional
    public UsuarioAdminResponse alternarBloqueio(UUID id) {
        Usuario usuario = usuarioRepository.findById(id)
            .orElseThrow(() -> new RegraNegocioException(HttpStatus.NOT_FOUND, "Usuário não encontrado."));

        if (isFundador(usuario.getEmail())) {
            throw new RegraNegocioException(
                HttpStatus.FORBIDDEN,
                "A conta ADM principal não pode ser bloqueada."
            );
        }

        usuario.setAtivo(!usuario.isAtivo());
        usuarioRepository.save(usuario);
        return respostaUsuario(usuario);
    }
}
