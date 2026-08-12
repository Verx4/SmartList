package br.com.minhalista.receita;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface HistoricoReceitaRepository extends JpaRepository<HistoricoReceita, UUID> {
    List<HistoricoReceita> findByUsuarioIdOrderByPreparadaEmDesc(UUID usuarioId);
}
