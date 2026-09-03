package br.com.minhalista.auth;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {

    long countByEmailHashAndCriadoEmGreaterThanEqual(String emailHash, Instant inicio);

    long countByIpHashAndCriadoEmGreaterThanEqual(String ipHash, Instant inicio);

    Optional<PasswordResetToken> findFirstByEmailHashOrderByCriadoEmDesc(String emailHash);

    Optional<PasswordResetToken> findByTokenRedefinicaoHash(String tokenHash);

    @Modifying
    @Query("""
        update PasswordResetToken token
           set token.invalidadoEm = :agora
         where token.emailHash = :emailHash
           and token.utilizadoEm is null
           and token.invalidadoEm is null
        """)
    int invalidarPendentesPorEmail(
        @Param("emailHash") String emailHash,
        @Param("agora") Instant agora
    );
}
