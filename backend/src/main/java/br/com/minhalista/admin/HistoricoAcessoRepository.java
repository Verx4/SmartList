package br.com.minhalista.admin;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface HistoricoAcessoRepository extends JpaRepository<HistoricoAcessoUsuario, UUID> {

    List<HistoricoAcessoUsuario> findTop100ByOrderByCriadoEmDesc();
}
