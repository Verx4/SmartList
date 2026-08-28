package br.com.minhalista.assinatura;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CupomRepository extends JpaRepository<Cupom, UUID> {

    Optional<Cupom> findByCodigoIgnoreCase(String codigo);

    List<Cupom> findAllByOrderByCriadoEmDesc();
}
