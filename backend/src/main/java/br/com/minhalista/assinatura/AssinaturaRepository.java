package br.com.minhalista.assinatura;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

public interface AssinaturaRepository extends JpaRepository<Assinatura, UUID> {

    Optional<Assinatura> findFirstByUsuarioIdAndStatusAndVenceEmAfterOrderByVenceEmDesc(
        UUID usuarioId,
        StatusAssinatura status,
        Instant agora
    );

    List<Assinatura> findAllByStatusAndVenceEmLessThanEqual(
        StatusAssinatura status,
        Instant agora
    );

    List<Assinatura> findAllByUsuarioIdAndStatusAndVenceEmLessThanEqual(
        UUID usuarioId,
        StatusAssinatura status,
        Instant agora
    );

    Optional<Assinatura> findByMercadoPagoPagamentoId(String pagamentoId);

    @EntityGraph(attributePaths = "usuario")
    List<Assinatura> findTop5ByUsuarioIdAndStatusAndMercadoPagoPreferenciaIdIsNotNullOrderByCriadoEmDesc(
        UUID usuarioId,
        StatusAssinatura status
    );

    @EntityGraph(attributePaths = "usuario")
    List<Assinatura> findTop20ByStatusAndMercadoPagoPreferenciaIdIsNotNullAndCriadoEmAfterOrderByCriadoEmAsc(
        StatusAssinatura status,
        Instant limite
    );

    boolean existsByUsuarioIdAndStatusAndVenceEmAfter(
        UUID usuarioId,
        StatusAssinatura status,
        Instant agora
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from Assinatura a join fetch a.usuario where a.id = :id")
    Optional<Assinatura> buscarPorIdParaAtualizacao(@Param("id") UUID id);

    long countByCicloAndStatus(CicloAssinatura ciclo, StatusAssinatura status);
}
