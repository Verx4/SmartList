package br.com.minhalista.assinatura;

import java.time.Instant;
import java.time.ZoneOffset;
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
    private final AssinaturaValidadeService validadeService;
    private final PlanoService planoService;
    private final CupomService cupomService;

    public AssinaturaService(
        AssinaturaRepository repository,
        UsuarioService usuarioService,
        AssinaturaValidadeService validadeService,
        PlanoService planoService,
        CupomService cupomService
    ) {
        this.repository = repository;
        this.usuarioService = usuarioService;
        this.validadeService = validadeService;
        this.planoService = planoService;
        this.cupomService = cupomService;
    }

    public List<PlanoResponse> catalogo() {
        return planoService.catalogo();
    }

    @Transactional
    public Optional<AssinaturaResponse> atual() {
        Usuario usuario = usuarioService.obterAutenticado();
        validadeService.sincronizarUsuario(usuario);
        return repository
            .findFirstByUsuarioIdAndStatusAndVenceEmAfterOrderByVenceEmDesc(
                usuario.getId(),
                StatusAssinatura.ATIVA,
                Instant.now()
            )
            .map(AssinaturaResponse::de);
    }

    @Transactional
    public Assinatura iniciarCheckout(
        Usuario usuario,
        CicloAssinatura ciclo,
        String codigoCupom
    ) {
        Assinatura assinatura = new Assinatura();
        assinatura.setUsuario(usuario);
        assinatura.setCiclo(ciclo);
        assinatura.setStatus(StatusAssinatura.PENDENTE);
        if (codigoCupom == null || codigoCupom.isBlank()) {
            assinatura.setValor(planoService.valorVigente(ciclo));
        } else {
            CupomAplicacaoResponse cupom = cupomService.aplicar(codigoCupom, ciclo);
            assinatura.setValor(cupom.total());
            assinatura.setCupomCodigo(cupom.codigo());
        }
        return repository.save(assinatura);
    }

    public CupomAplicacaoResponse validarCupom(String codigo, CicloAssinatura ciclo) {
        return cupomService.aplicar(codigo, ciclo);
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
        processarPagamentoInterno(pagamento, null);
    }

    @Transactional
    public boolean confirmarPagamentoDoUsuario(
        PagamentoConsultado pagamento,
        UUID usuarioId
    ) {
        return processarPagamentoInterno(pagamento, usuarioId);
    }

    private boolean processarPagamentoInterno(
        PagamentoConsultado pagamento,
        UUID usuarioIdEsperado
    ) {
        UUID assinaturaId = converterReferencia(pagamento.referenciaExterna());

        if (assinaturaId == null) {
            LOG.warn("Pagamento Mercado Pago {} ignorado: referência externa inválida.", pagamento.id());
            return false;
        }

        Optional<Assinatura> assinaturaEncontrada =
            repository.buscarPorIdParaAtualizacao(assinaturaId);

        if (assinaturaEncontrada.isEmpty()) {
            LOG.warn("Pagamento Mercado Pago {} ignorado: checkout local não encontrado.", pagamento.id());
            return false;
        }

        Assinatura assinatura = assinaturaEncontrada.get();

        if (usuarioIdEsperado != null
            && !usuarioIdEsperado.equals(assinatura.getUsuario().getId())) {
            LOG.warn(
                "Pagamento Mercado Pago {} não pertence ao usuário autenticado.",
                pagamento.id()
            );
            return false;
        }

        if (!dadosConferem(assinatura, pagamento)) {
            LOG.warn("Pagamento Mercado Pago {} ignorado: valor, moeda ou metadados divergentes.", pagamento.id());
            return false;
        }

        String status = pagamento.status() == null
            ? ""
            : pagamento.status().toLowerCase(Locale.ROOT);

        return switch (status) {
            case "approved" -> {
                ativar(assinatura, pagamento.id());
                yield assinatura.getStatus() == StatusAssinatura.ATIVA
                    && pagamento.id().equals(assinatura.getMercadoPagoPagamentoId())
                    && assinatura.getVenceEm() != null
                    && assinatura.getVenceEm().isAfter(Instant.now());
            }
            case "refunded", "charged_back", "cancelled" -> {
                cancelar(assinatura, pagamento.id());
                yield false;
            }
            default -> {
                LOG.info(
                    "Pagamento Mercado Pago {} mantido pendente com status {}.",
                    pagamento.id(),
                    status
                );
                yield false;
            }
        };
    }

    private boolean dadosConferem(Assinatura assinatura, PagamentoConsultado pagamento) {
        return assinatura.getId().toString().equals(pagamento.assinaturaIdMetadata())
            && assinatura.getCiclo().name().equalsIgnoreCase(pagamento.cicloMetadata())
            && pagamento.valor() != null
            && assinatura.getValor().compareTo(pagamento.valor()) == 0
            && "BRL".equalsIgnoreCase(pagamento.moeda());
    }

    private void ativar(Assinatura assinatura, String pagamentoId) {
        Optional<Assinatura> pagamentoExistente =
            repository.findByMercadoPagoPagamentoId(pagamentoId);

        if (pagamentoExistente.isPresent()) {
            Assinatura existente = pagamentoExistente.get();

            if (existente.getId().equals(assinatura.getId())
                && existente.getStatus() == StatusAssinatura.ATIVA) {
                existente.getUsuario().setTipoAcesso(TipoAcesso.PREMIUM);
            }

            return;
        }

        if (assinatura.getStatus() == StatusAssinatura.ATIVA) {
            LOG.warn(
                "Checkout {} já está ativo e não será creditado novamente.",
                assinatura.getId()
            );
            return;
        }

        if (assinatura.getStatus() != StatusAssinatura.PENDENTE) {
            return;
        }

        Usuario usuario = assinatura.getUsuario();
        Instant agora = Instant.now();
        validadeService.sincronizarUsuario(usuario);
        Instant base = repository
            .findFirstByUsuarioIdAndStatusAndVenceEmAfterOrderByVenceEmDesc(
                usuario.getId(),
                StatusAssinatura.ATIVA,
                agora
            )
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
            && !repository.existsByUsuarioIdAndStatusAndVenceEmAfter(
                usuario.getId(),
                StatusAssinatura.ATIVA,
                Instant.now()
            )) {
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
