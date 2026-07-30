package br.com.minhalista.encarte;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FonteEncarteRepository extends JpaRepository<FonteEncarte, UUID> {

    Optional<FonteEncarte> findByChaveFonte(String chaveFonte);

    @Query("""
        select f
        from FonteEncarte f
        join fetch f.unidade
        where f.id = :id
        """)
    Optional<FonteEncarte> buscarComUnidadePorId(@Param("id") UUID id);

    @Query("""
        select f
        from FonteEncarte f
        join fetch f.unidade
        where f.ativa = true
          and (f.proximaTentativaEm is null or f.proximaTentativaEm <= :agora)
        order by case when f.verificadaEm is null then 0 else 1 end, f.verificadaEm asc
        """)
    List<FonteEncarte> buscarPendentes(@Param("agora") Instant agora);

    @Query("""
        select f
        from FonteEncarte f
        join fetch f.unidade
        order by f.criadaEm desc
        """)
    List<FonteEncarte> listarComUnidade();
}
