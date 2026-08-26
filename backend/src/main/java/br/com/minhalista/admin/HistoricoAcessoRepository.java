package br.com.minhalista.admin;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface HistoricoAcessoRepository extends JpaRepository<HistoricoAcessoUsuario, UUID> {

    List<HistoricoAcessoUsuario> findTop100ByOrderByCriadoEmDesc();

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from HistoricoAcessoUsuario")
    int limparTodos();
}
