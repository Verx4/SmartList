package br.com.minhalista.listasync;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

public interface EstadoListasUsuarioRepository
    extends JpaRepository<EstadoListasUsuario, UUID> {

    Optional<EstadoListasUsuario> findByUsuarioId(UUID usuarioId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select estado from EstadoListasUsuario estado where estado.usuario.id = :usuarioId")
    Optional<EstadoListasUsuario> buscarParaAtualizacao(@Param("usuarioId") UUID usuarioId);
}
