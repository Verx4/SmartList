package br.com.minhalista.pagamento;

import java.util.Collection;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

public interface PagamentoRepository extends JpaRepository<Pagamento, UUID> {

    Optional<Pagamento> findByProviderPaymentId(String providerPaymentId);

    Optional<Pagamento> findByExternalReference(String externalReference);

    @EntityGraph(attributePaths = {"usuario", "assinatura"})
    Optional<Pagamento> findByPublicIdAndUsuarioId(UUID publicId, UUID usuarioId);

    @EntityGraph(attributePaths = {"usuario", "assinatura"})
    Optional<Pagamento> findFirstByUsuarioIdAndPaymentMethodAndStatusInOrderByCreatedAtDesc(
        UUID usuarioId,
        FormaPagamento paymentMethod,
        Collection<StatusPagamento> statuses
    );

    @EntityGraph(attributePaths = {"usuario", "assinatura"})
    Optional<Pagamento> findFirstByUsuarioIdAndPlanIdAndPaymentMethodAndStatusInOrderByCreatedAtDesc(
        UUID usuarioId,
        String planId,
        FormaPagamento paymentMethod,
        Collection<StatusPagamento> statuses
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Pagamento p join fetch p.usuario join fetch p.assinatura where p.id = :id")
    Optional<Pagamento> buscarPorIdParaAtualizacao(@Param("id") UUID id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Pagamento p join fetch p.usuario join fetch p.assinatura where p.providerPaymentId = :providerPaymentId")
    Optional<Pagamento> buscarPorProviderIdParaAtualizacao(
        @Param("providerPaymentId") String providerPaymentId
    );
}
