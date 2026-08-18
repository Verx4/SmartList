package br.com.minhalista.assinatura;

import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.minhalista.pagamento.PagamentoConsultado;
import br.com.minhalista.usuario.TipoAcesso;
import br.com.minhalista.usuario.Usuario;
import br.com.minhalista.usuario.UsuarioService;

@Service
public class AssinaturaService {

    private static final Logger LOG = LoggerFactory.getLogger(AssinaturaService.class);

    private final AssinaturaRepository repository;
    private final UsuarioService usuarioService;

    public AssinaturaService(
        AssinaturaRepository repository,
        UsuarioService usuarioService
    ) {
        this.repository = repository;
        this.usuarioService = usuarioService;
    }

    public List<PlanoResponse> catalogo() {
        return Arrays.stream(CicloAssinatura.values()).map(PlanoResponse::de).toList();
    }

    @Transactional(readOnly = true)
    public Optional<AssinaturaResponse> atual() {
        Usuario usuario = usuarioService.obterAutenticado();
        return repository
            .findFirstByUsuarioIdAndStatusOrderByVenceEmDesc(usuario.getId(), StatusAssinatura.ATIVA)
            .map(AssinaturaResponse::de);
    }

    @Transactional
    public Assinatura iniciarCheckout(Usuario usuario, CicloAssinatura ciclo) {
        Assinatura assinatura = new Assinatura();
        assinatura.setUsuario(usuario);
        assinatura.setCiclo(ciclo);
        assinatura.setStatus(StatusAssinatura.PENDENTE);
        assinatura.setValor(ciclo.getValor());
        return repository.save(assinatura);
    }

    @Transactional
    public void vincularPreferencia(UUID assinaturaId, String preferenciaId) {
        repository.buscarPorIdParaAtualizacao(assinaturaId).ifPresent(assinatura -> {
            if (assinatura.getMercadoPagoPreferenciaId() == null) {
                assinatura.setMercadoPagoPreferenciaId(preferenciaId);
            }
        });
    }

    @Transactional
    public void registrarFalhaCheckout(UUID assinaturaId) {
        repository.buscarPorIdParaAtualizacao(assinaturaId).ifPresent(assinatura -> {
            if (assinatura.getStatus() == StatusAssinatura.PENDENTE
                && assinatura.getMercadoPagoPreferenciaId() == null) {
                assinatura.setStatus(StatusAssinatura.CANCELADA);
            }
        });
    }

    @Transactional
    public void processarPagamento(PagamentoConsultado pagamento) {
        UUID assinaturaId = converterReferencia(pagamento.referenciaExterna());

        if (assinaturaId == null) {
            LOG.warn("Pagamento Mercado Pago {} ignorado: referência externa inválida.", pagamento.id());
            return;
        }

        Optional<Assinatura> assinaturaEncontrada =
            repository.buscarPorIdParaAtualizacao(assinaturaId);

        if (assinaturaEncontrada.isEmpty()) {
            LOG.warn("Pagamento Mercado Pago {} ignorado: checkout local não encontrado.", pagamento.id());
            return;
        }

        Assinatura assinatura = assinaturaEncontrada.get();

        if (!dadosConferem(assinatura, pagamento)) {
            LOG.warn("Pagamento Mercado Pago {} ignorado: valor, moeda ou metadados divergentes.", pagamento.id());
            return;
        }

        String status = pagamento.status() == null
            ? ""
            : pagamento.status().toLowerCase(Locale.ROOT);

        switch (status) {
            case "approved" -> ativarPremium(assinatura, pagamento.id());
            case "refunded", "charged_back", "cancelled" ->
                cancelar(assinatura, pagamento.id());
            default -> LOG.info(
                "Pagamento Mercado Pago {} mantido pendente com status {}.",
                pagamento.id(),
                status
            );
        }
    }

    @Transactional
    public Assinatura ativarPremium(UUID assinaturaId, String pagamentoId) {
        Optional<Assinatura> assinaturaEncontrada =
            repository.buscarPorIdParaAtualizacao(assinaturaId);

        if (assinaturaEncontrada.isEmpty()) {
            LOG.warn(
                "Assinatura {} não encontrada ao ativar pagamento {}.",
                assinaturaId,
                pagamentoId
            );
            return null;
        }

        return ativarPremium(assinaturaEncontrada.get(), pagamentoId);
    }

    @Transactional
    public void cancelarPagamento(UUID assinaturaId, String pagamentoId) {
        repository.buscarPorIdParaAtualizacao(assinaturaId)
            .ifPresent(assinatura -> cancelar(assinatura, pagamentoId));
    }

    private boolean dadosConferem(Assinatura assinatura, PagamentoConsultado pagamento) {
        return assinatura.getId().toString().equals(pagamento.assinaturaIdMetadata())
            && assinatura.getCiclo().name().equalsIgnoreCase(pagamento.cicloMetadata())
            && pagamento.valor() != null
            && assinatura.getValor().compareTo(pagamento.valor()) == 0
            && "BRL".equalsIgnoreCase(pagamento.moeda());
    }

    private Assinatura ativarPremium(Assinatura assinatura, String pagamentoId) {
        Optional<Assinatura> pagamentoExistente =
            repository.findByMercadoPagoPagamentoId(pagamentoId);

        if (pagamentoExistente.isPresent()) {
            return pagamentoExistente.get();
        }

        if (assinatura.getStatus() == StatusAssinatura.ATIVA) {
            LOG.warn(
                "Checkout {} já está ativo e não será creditado novamente.",
                assinatura.getId()
            );
            return assinatura;
        }

        if (assinatura.getStatus() != StatusAssinatura.PENDENTE) {
            return assinatura;
        }

        Usuario usuario = usuarioService.obterPorIdParaAtualizacao(
            assinatura.getUsuario().getId()
        );
        Instant agora = Instant.now();
        Instant base = repository
            .findFirstByUsuarioIdAndStatusOrderByVenceEmDesc(usuario.getId(), StatusAssinatura.ATIVA)
            .map(Assinatura::getVenceEm)
            .filter(data -> data != null && data.isAfter(agora))
            .orElse(agora);
        Instant vencimento = base
            .atZone(ZoneOffset.UTC)
            .plusMonths(assinatura.getCiclo().getMeses())
            .toInstant();

        assinatura.setStatus(StatusAssinatura.ATIVA);
        assinatura.setMercadoPagoPagamentoId(pagamentoId);
        assinatura.setInicioEm(agora);
        assinatura.setVenceEm(vencimento);

        usuario.setTipoAcesso(TipoAcesso.PREMIUM);
        return assinatura;
    }

    private void cancelar(Assinatura assinatura, String pagamentoId) {
        String pagamentoVinculado = assinatura.getMercadoPagoPagamentoId();

        if (pagamentoVinculado != null && !pagamentoVinculado.equals(pagamentoId)) {
            return;
        }

        assinatura.setMercadoPagoPagamentoId(pagamentoId);
        assinatura.setStatus(StatusAssinatura.CANCELADA);

        Usuario usuario = assinatura.getUsuario();

        if (usuario.getTipoAcesso() == TipoAcesso.PREMIUM
            && !repository.existsByUsuarioIdAndStatus(usuario.getId(), StatusAssinatura.ATIVA)) {
            usuario.setTipoAcesso(TipoAcesso.FREE);
        }
    }

    private UUID converterReferencia(String referencia) {
        try {
            return referencia == null ? null : UUID.fromString(referencia);
        } catch (IllegalArgumentException erro) {
            return null;
        }
    }
}
