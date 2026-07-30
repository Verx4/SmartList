package br.com.minhalista.localizacao;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LocalizacaoUsuarioRepository
    extends JpaRepository<LocalizacaoUsuario, UUID> {

    Optional<LocalizacaoUsuario> findByUsuarioId(UUID usuarioId);

    long countByLocalidadeExpiraEmAfter(Instant agora);

    long countByAtualizadaEmAfter(Instant limite);

    @Query("""
        select l
        from LocalizacaoUsuario l
        left join fetch l.unidadeConfirmada u
        where l.localidadeExpiraEm > :agora
        """)
    List<LocalizacaoUsuario> buscarAtivasParaAgregacao(@Param("agora") Instant agora);

    @Modifying
    @Query("""
        update LocalizacaoUsuario l
        set l.latitude = null,
            l.longitude = null,
            l.precisaoMetros = null,
            l.coordenadasExpiramEm = null
        where l.coordenadasExpiramEm is not null
          and l.coordenadasExpiramEm < :agora
        """)
    int apagarCoordenadasExpiradas(@Param("agora") Instant agora);

    long deleteByLocalidadeExpiraEmBefore(Instant limite);
}
