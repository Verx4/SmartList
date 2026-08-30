package br.com.minhalista.assinatura;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import br.com.minhalista.common.RegraNegocioException;
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
            try {
                CupomAplicacaoResponse cupom = cupomService.aplicar(codigoCupom, ciclo);
                assinatura.setValor(cupom.total());
                assinatura.setCupomCodigo(cupom.codigo());
                assinatura.setCupomPercentualDesconto(cupom.percentualDesconto());
                assinatura.setCupomValorDesconto(cupom.desconto());
                assinatura.setCupomValorOriginal(cupom.valorOriginal());
                assinatura.setCupomAplicadoEm(Instant.now());
                assinatura.setCupomPrimeiraCobrancaSomente(
                    cupom.primeiraCobrancaSomente()
                );
            } catch (RegraNegocioException cupomNaoCadastradoLocalmente) {
                BigDecimal valorOriginal = planoService.valorVigente(ciclo);
                assinatura.setValor(valorOriginal);
                assinatura.setCupomCodigo(
                    codigoCupom.trim().toUpperCase(Locale.ROOT)
                );
                assinatura.setCupomPercentualDesconto(BigDecimal.ZERO);
                assinatura.setCupomValorDesconto(BigDecimal.ZERO);
                assinatura.setCupomValorOriginal(valorOriginal);
                assinatura.setCupomAplicadoEm(Instant.now());
                assinatura.setCupomPrimeiraCobrancaSomente(true);
                LOG.info(
                    "Cupom {} será validado diretamente pela Kiwify.",
                    assinatura.getCupomCodigo()
                );
            }
            assinatura.setCupomPrimeiroPagamentoAplicado(false);
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

    @Transactional
    public boolean processarVendaKiwify(
        Map<String, Object> venda,
        String evento
    ) {
        String orderId = texto(venda.get("id"));
        Map<String, Object> tracking = mapa(venda.get("tracking"));
        UUID assinaturaId = converterReferencia(texto(tracking.get("s1")));

        if (!StringUtils.hasText(orderId) || assinaturaId == null) {
            LOG.warn("Venda Kiwify ignorada: pedido ou parâmetro s1 inválido.");
            return false;
        }

        Optional<Assinatura> encontrada =
            repository.buscarPorIdParaAtualizacao(assinaturaId);
        if (encontrada.isEmpty()) {
            LOG.warn("Venda Kiwify {} ignorada: assinatura não encontrada.", orderId);
            return false;
        }

        Assinatura assinatura = encontrada.get();
        Map<String, Object> pagamento = mapa(venda.get("payment"));
        Map<String, Object> cliente = mapa(venda.get("customer"));
        BigDecimal valor = decimal(pagamento.get("charge_amount"))
            .movePointLeft(2);
        String moeda = texto(pagamento.get("charge_currency"));
        String email = texto(cliente.get("email"));
        String status = texto(venda.get("status")).toLowerCase(Locale.ROOT);
        String eventoNormalizado = evento == null
            ? ""
            : evento.toLowerCase(Locale.ROOT);
        String pagamentoId = "kiwify:" + orderId;

        BigDecimal valorMaximo = StringUtils.hasText(assinatura.getCupomCodigo())
            && assinatura.getCupomValorOriginal() != null
                ? assinatura.getCupomValorOriginal()
                : assinatura.getValor();
        boolean valorConfere = StringUtils.hasText(assinatura.getCupomCodigo())
            ? valor.signum() > 0 && valor.compareTo(valorMaximo) <= 0
            : assinatura.getValor().compareTo(valor) == 0;
        boolean dadosConferem =
            valorConfere
            && "BRL".equalsIgnoreCase(moeda)
            && assinatura.getUsuario().getEmail().equalsIgnoreCase(email);

        if (!dadosConferem) {
            LOG.warn(
                "Venda Kiwify {} rejeitada: valor/moeda/email divergentes para checkout {}.",
                orderId,
                assinaturaId
            );
            return false;
        }

        if (eventoNormalizado.contains("refund")
            || eventoNormalizado.contains("chargeback")) {
            cancelar(assinatura, pagamentoId);
            return false;
        }

        if (eventoNormalizado.contains("canceled")
            || eventoNormalizado.contains("late")) {
            LOG.info(
                "Assinatura Kiwify {} recebeu evento {}; acesso preservado até o vencimento.",
                assinaturaId,
                eventoNormalizado
            );
            return false;
        }

        if (!"paid".equals(status)) {
            LOG.info("Venda Kiwify {} ainda não está paga: {}.", orderId, status);
            return false;
        }

        assinatura.setValor(valor);

        if (pagamentoId.equals(assinatura.getMercadoPagoPagamentoId())) {
            return assinatura.getStatus() == StatusAssinatura.ATIVA;
        }

        if (assinatura.getStatus() == StatusAssinatura.PENDENTE) {
            ativar(assinatura, pagamentoId);
        } else if (
            assinatura.getStatus() == StatusAssinatura.ATIVA
            && eventoNormalizado.contains("renew")
        ) {
            Instant agora = Instant.now();
            Instant base = assinatura.getVenceEm() != null
                && assinatura.getVenceEm().isAfter(agora)
                    ? assinatura.getVenceEm()
                    : agora;
            assinatura.setVenceEm(
                base.atZone(ZoneOffset.UTC)
                    .plusMonths(assinatura.getCiclo().getMeses())
                    .toInstant()
            );
            assinatura.setMercadoPagoPagamentoId(pagamentoId);
            assinatura.getUsuario().setTipoAcesso(TipoAcesso.PREMIUM);
        }

        return assinatura.getStatus() == StatusAssinatura.ATIVA
            && assinatura.getVenceEm() != null
            && assinatura.getVenceEm().isAfter(Instant.now());
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> mapa(Object valor) {
        return valor instanceof Map<?, ?> mapa
            ? (Map<String, Object>) mapa
            : Map.of();
    }

    private String texto(Object valor) {
        return valor == null ? "" : valor.toString().trim();
    }

    private BigDecimal decimal(Object valor) {
        try {
            return valor == null
                ? BigDecimal.ZERO
                : new BigDecimal(valor.toString());
        } catch (NumberFormatException erro) {
            return BigDecimal.ZERO;
        }
    }

    private boolean dadosConferem(Assinatura assinatura, PagamentoConsultado pagamento) {
        boolean assinaturaMetadataConfere =
            !StringUtils.hasText(pagamento.assinaturaIdMetadata())
                || assinatura.getId().toString()
                    .equals(pagamento.assinaturaIdMetadata());
        boolean cicloMetadataConfere =
            !StringUtils.hasText(pagamento.cicloMetadata())
                || assinatura.getCiclo().name()
                    .equalsIgnoreCase(pagamento.cicloMetadata());
        boolean valorConfere = pagamento.valor() != null
            && assinatura.getValor().compareTo(pagamento.valor()) == 0;
        boolean moedaConfere = "BRL".equalsIgnoreCase(pagamento.moeda());

        if (!assinaturaMetadataConfere
            || !cicloMetadataConfere
            || !valorConfere
            || !moedaConfere) {
            LOG.warn(
                "Pagamento Mercado Pago rejeitado na conferência: checkout={}, assinaturaMetadata={}, cicloMetadata={}, valor={}, moeda={}.",
                assinatura.getId(),
                assinaturaMetadataConfere,
                cicloMetadataConfere,
                valorConfere,
                moedaConfere
            );
        }

        return assinaturaMetadataConfere
            && cicloMetadataConfere
            && valorConfere
            && moedaConfere;
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

        if (assinatura.getCupomCodigo() != null
            && !assinatura.getCupomCodigo().isBlank()) {
            assinatura.setCupomPrimeiroPagamentoAplicado(true);
        }

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
