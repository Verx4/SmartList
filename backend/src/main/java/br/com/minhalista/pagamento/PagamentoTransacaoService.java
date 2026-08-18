package br.com.minhalista.pagamento;

import java.time.Instant;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.minhalista.assinatura.Assinatura;
import br.com.minhalista.assinatura.AssinaturaService;
import br.com.minhalista.assinatura.CicloAssinatura;
import br.com.minhalista.common.RegraNegocioException;
import br.com.minhalista.usuario.Usuario;
import br.com.minhalista.usuario.UsuarioRepository;

import org.springframework.http.HttpStatus;

@Service
public class PagamentoTransacaoService {

    private static final Logger LOG = LoggerFactory.getLogger(PagamentoTransacaoService.class);
    private static final Set<StatusPagamento> STATUS_REUTILIZAVEIS =
        Set.of(StatusPagamento.CREATED, StatusPagamento.PENDING);

    private final PagamentoRepository pagamentoRepository;
    private final UsuarioRepository usuarioRepository;
    private final AssinaturaService assinaturaService;

    public PagamentoTransacaoService(
        PagamentoRepository pagamentoRepository,
        UsuarioRepository usuarioRepository,
        AssinaturaService assinaturaService
    ) {
        this.pagamentoRepository = pagamentoRepository;
        this.usuarioRepository = usuarioRepository;
        this.assinaturaService = assinaturaService;
    }

    @Transactional
    public Pagamento preparar(UUID usuarioId, CicloAssinatura ciclo) {
        Usuario usuario = usuarioRepository.buscarPorIdParaAtualizacao(usuarioId)
            .orElseThrow(() -> new RegraNegocioException(
                HttpStatus.UNAUTHORIZED,
                "Usuário autenticado não foi encontrado."
            ));

        Optional<Pagamento> existente = pagamentoRepository
            .findFirstByUsuarioIdAndPlanIdAndPaymentMethodAndStatusInOrderByCreatedAtDesc(
                usuarioId,
                ciclo.getPlanId(),
                FormaPagamento.PIX,
                STATUS_REUTILIZAVEIS
            );

        if (existente.isPresent()) {
            Pagamento pagamento = existente.get();

            if (pagamento.getExpiresAt() == null
                || pagamento.getExpiresAt().isAfter(Instant.now())) {
                return pagamento;
            }

            pagamento.setStatus(StatusPagamento.EXPIRED);
            pagamento.setProviderStatus("expired_local");
        }

        Assinatura assinatura = assinaturaService.iniciarCheckout(usuario, ciclo);
        Pagamento pagamento = new Pagamento();
        pagamento.setPublicId(UUID.randomUUID());
        pagamento.setIdempotencyKey(UUID.randomUUID());
        pagamento.setUsuario(usuario);
        pagamento.setAssinatura(assinatura);
        pagamento.setProvider("mercado_pago");
        pagamento.setExternalReference(assinatura.getId().toString());
        pagamento.setPlanId(ciclo.getPlanId());
        pagamento.setAmount(ciclo.getValor());
        pagamento.setCurrency("BRL");
        pagamento.setPaymentMethod(FormaPagamento.PIX);
        pagamento.setStatus(StatusPagamento.CREATED);
        return pagamentoRepository.saveAndFlush(pagamento);
    }

    @Transactional
    public Pagamento vincular(UUID pagamentoId, MercadoPagoPixCriado criado) {
        Pagamento pagamento = pagamentoRepository.buscarPorIdParaAtualizacao(pagamentoId)
            .orElseThrow(() -> new RegraNegocioException(
                HttpStatus.NOT_FOUND,
                "Pagamento não encontrado."
            ));

        if (pagamento.getProviderPaymentId() != null
            && !pagamento.getProviderPaymentId().equals(criado.providerPaymentId())) {
            LOG.error(
                "Divergência de idempotência no pagamento público {}.",
                pagamento.getPublicId()
            );
            throw new RegraNegocioException(
                HttpStatus.CONFLICT,
                "Não foi possível concluir a criação do PIX."
            );
        }

        pagamento.setProviderPaymentId(criado.providerPaymentId());
        pagamento.setProviderStatus(criado.status());
        pagamento.setStatus(statusInicial(criado.status()));
        pagamento.setPixQrCode(criado.qrCode());
        pagamento.setPixQrCodeBase64(criado.qrCodeBase64());
        pagamento.setPixTicketUrl(criado.ticketUrl());
        pagamento.setExpiresAt(criado.expiresAt());
        return pagamento;
    }

    @Transactional(readOnly = true)
    public Pagamento obterDoUsuario(UUID publicId, UUID usuarioId) {
        return pagamentoRepository.findByPublicIdAndUsuarioId(publicId, usuarioId)
            .orElseThrow(() -> new RegraNegocioException(
                HttpStatus.NOT_FOUND,
                "Pagamento não encontrado."
            ));
    }

    @Transactional(readOnly = true)
    public Optional<Pagamento> obterPendente(UUID usuarioId) {
        return pagamentoRepository
            .findFirstByUsuarioIdAndPaymentMethodAndStatusInOrderByCreatedAtDesc(
                usuarioId,
                FormaPagamento.PIX,
                STATUS_REUTILIZAVEIS
            );
    }

    @Transactional
    public boolean processarSePix(PagamentoConsultado consultado) {
        Optional<Pagamento> encontrado = pagamentoRepository
            .findByProviderPaymentId(consultado.id());

        if (encontrado.isEmpty() && consultado.referenciaExterna() != null) {
            encontrado = pagamentoRepository.findByExternalReference(
                consultado.referenciaExterna()
            );
        }

        if (encontrado.isEmpty()) {
            return "pix".equalsIgnoreCase(consultado.formaPagamento());
        }

        Pagamento pagamento = pagamentoRepository
            .buscarPorIdParaAtualizacao(encontrado.get().getId())
            .orElseThrow();

        if (pagamento.getProviderPaymentId() == null) {
            pagamento.setProviderPaymentId(consultado.id());
        }

        if (!dadosConferem(pagamento, consultado)) {
            LOG.warn(
                "Pagamento Mercado Pago {} ignorado por dados divergentes.",
                consultado.id()
            );
            return true;
        }

        StatusPagamento status = converterStatus(consultado.status());
        pagamento.setProviderStatus(consultado.status());

        if (consultado.expiraEm() != null) {
            pagamento.setExpiresAt(consultado.expiraEm());
        }

        if (status == StatusPagamento.APPROVED) {
            if (!pagamento.isBenefitGranted()) {
                Assinatura assinatura = assinaturaService.ativarPremium(
                    pagamento.getAssinatura().getId(),
                    consultado.id()
                );

                if (assinatura != null) {
                    pagamento.setBenefitGranted(true);
                    pagamento.setProcessedAt(Instant.now());
                    pagamento.setPaidAt(
                        consultado.aprovadoEm() == null
                            ? Instant.now()
                            : consultado.aprovadoEm()
                    );
                }
            }
            pagamento.setStatus(StatusPagamento.APPROVED);
        } else if (status == StatusPagamento.REFUNDED) {
            pagamento.setStatus(StatusPagamento.REFUNDED);
            assinaturaService.cancelarPagamento(
                pagamento.getAssinatura().getId(),
                consultado.id()
            );
        } else if (status != null) {
            pagamento.setStatus(status);
        }

        if (!pagamento.getStatus().terminal()
            && pagamento.getExpiresAt() != null
            && !pagamento.getExpiresAt().isAfter(Instant.now())) {
            pagamento.setStatus(StatusPagamento.EXPIRED);
        }

        return true;
    }

    @Transactional
    public Pagamento expirarSeNecessario(UUID pagamentoId) {
        Pagamento pagamento = pagamentoRepository.buscarPorIdParaAtualizacao(pagamentoId)
            .orElseThrow();

        if (!pagamento.getStatus().terminal()
            && pagamento.getExpiresAt() != null
            && !pagamento.getExpiresAt().isAfter(Instant.now())) {
            pagamento.setStatus(StatusPagamento.EXPIRED);
            pagamento.setProviderStatus("expired_local");
        }

        return pagamento;
    }

    private boolean dadosConferem(
        Pagamento pagamento,
        PagamentoConsultado consultado
    ) {
        String assinaturaId = pagamento.getAssinatura().getId().toString();

        return Objects.equals(pagamento.getProviderPaymentId(), consultado.id())
            && pagamento.getExternalReference().equals(consultado.referenciaExterna())
            && assinaturaId.equals(consultado.assinaturaIdMetadata())
            && pagamento.getUsuario().getId().toString().equals(consultado.usuarioIdMetadata())
            && pagamento.getPlanId().equals(consultado.planIdMetadata())
            && pagamento.getPublicId().toString().equals(consultado.paymentPublicIdMetadata())
            && pagamento.getAssinatura().getCiclo().name().equalsIgnoreCase(
                consultado.cicloMetadata()
            )
            && consultado.valor() != null
            && pagamento.getAmount().compareTo(consultado.valor()) == 0
            && "BRL".equalsIgnoreCase(consultado.moeda())
            && "pix".equalsIgnoreCase(consultado.formaPagamento());
    }

    private StatusPagamento statusInicial(String status) {
        StatusPagamento convertido = converterStatus(status);
        return convertido == null || convertido == StatusPagamento.CREATED
            ? StatusPagamento.PENDING
            : convertido;
    }

    private StatusPagamento converterStatus(String status) {
        String normalizado = status == null
            ? ""
            : status.trim().toLowerCase(Locale.ROOT);

        return switch (normalizado) {
            case "approved" -> StatusPagamento.APPROVED;
            case "rejected" -> StatusPagamento.REJECTED;
            case "cancelled" -> StatusPagamento.CANCELLED;
            case "expired" -> StatusPagamento.EXPIRED;
            case "refunded", "charged_back" -> StatusPagamento.REFUNDED;
            case "pending", "in_process", "authorized" -> StatusPagamento.PENDING;
            case "created" -> StatusPagamento.CREATED;
            default -> null;
        };
    }
}
