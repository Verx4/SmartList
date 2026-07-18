package br.com.minhalista.config;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;

import javax.sql.DataSource;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;

/**
 * Converte a URL PostgreSQL fornecida por provedores como o Neon para uma
 * fonte JDBC, sem registrar ou persistir credenciais no projeto.
 */
@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(name = DatabaseUrlDataSourceConfig.DATABASE_URL)
public class DatabaseUrlDataSourceConfig {

    static final String DATABASE_URL = "DATABASE_URL";

    @Bean
    @Primary
    DataSource dataSource(@Value("${DATABASE_URL}") String databaseUrl) {
        CredenciaisBanco credenciais = converter(databaseUrl.trim());
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(credenciais.jdbcUrl());
        config.setUsername(credenciais.usuario());
        config.setPassword(credenciais.senha());
        config.setPoolName("SmartListPool");
        config.setMaximumPoolSize(5);
        config.setMinimumIdle(0);
        config.setConnectionTimeout(30_000);
        return new HikariDataSource(config);
    }

    static CredenciaisBanco converter(String databaseUrl) {
        URI uri;

        try {
            uri = URI.create(databaseUrl);
        } catch (IllegalArgumentException erro) {
            throw new IllegalStateException("DATABASE_URL inválida.", erro);
        }

        if (!("postgresql".equalsIgnoreCase(uri.getScheme())
            || "postgres".equalsIgnoreCase(uri.getScheme()))) {
            throw new IllegalStateException("DATABASE_URL deve usar PostgreSQL.");
        }

        if (uri.getHost() == null || uri.getHost().isBlank()) {
            throw new IllegalStateException("DATABASE_URL sem servidor PostgreSQL.");
        }

        String[] credenciais = separarCredenciais(uri.getRawUserInfo());
        return new CredenciaisBanco(
            montarJdbcUrl(uri),
            decodificar(credenciais[0]),
            decodificar(credenciais[1])
        );
    }

    private static String[] separarCredenciais(String userInfo) {
        if (userInfo == null || !userInfo.contains(":")) {
            throw new IllegalStateException("DATABASE_URL sem usuário ou senha.");
        }

        return userInfo.split(":", 2);
    }

    private static String montarJdbcUrl(URI uri) {
        StringBuilder jdbc = new StringBuilder("jdbc:postgresql://")
            .append(uri.getHost());

        if (uri.getPort() > 0) {
            jdbc.append(':').append(uri.getPort());
        }

        String caminho = uri.getRawPath();
        jdbc.append(caminho == null || caminho.isBlank() ? "/postgres" : caminho);

        String consulta = normalizarConsulta(uri.getRawQuery());
        if (!consulta.isBlank()) {
            jdbc.append('?').append(consulta);
        }

        return jdbc.toString();
    }

    private static String normalizarConsulta(String consulta) {
        if (consulta == null || consulta.isBlank()) {
            return "sslmode=require";
        }

        return consulta.replace("channel_binding=", "channelBinding=");
    }

    private static String decodificar(String valor) {
        return URLDecoder.decode(valor, StandardCharsets.UTF_8);
    }

    record CredenciaisBanco(String jdbcUrl, String usuario, String senha) {
    }
}
