package br.com.minhalista.assinatura;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PlanoRepository extends JpaRepository<Plano, CicloAssinatura> {
}
