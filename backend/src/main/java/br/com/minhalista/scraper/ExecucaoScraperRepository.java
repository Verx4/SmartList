package br.com.minhalista.scraper;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ExecucaoScraperRepository extends JpaRepository<ExecucaoScraper, UUID> {

    List<ExecucaoScraper> findTop20ByOrderByIniciadaEmDesc();
}
