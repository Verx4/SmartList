package br.com.minhalista.oferta;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface UnidadeMercadoRepository extends JpaRepository<UnidadeMercado, UUID> {

    Optional<UnidadeMercado> findByChaveExterna(String chaveExterna);

    List<UnidadeMercado> findByAtivaTrueAndLatitudeBetweenAndLongitudeBetween(
        double latitudeMinima,
        double latitudeMaxima,
        double longitudeMinima,
        double longitudeMaxima
    );

    List<UnidadeMercado> findTop100ByAtivaTrueAndCidadeIgnoreCaseOrderByRedeAscNomeAsc(String cidade);
}
