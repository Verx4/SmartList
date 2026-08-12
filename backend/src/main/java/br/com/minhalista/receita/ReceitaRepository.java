package br.com.minhalista.receita;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ReceitaRepository extends JpaRepository<Receita, String> {
}
