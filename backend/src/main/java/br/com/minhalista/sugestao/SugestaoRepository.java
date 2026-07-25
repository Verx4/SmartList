package br.com.minhalista.sugestao;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SugestaoRepository extends JpaRepository<Sugestao, UUID> {
    List<Sugestao> findAllByOrderByCriadoEmDesc();
}
