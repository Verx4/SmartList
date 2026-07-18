package br.com.minhalista.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class DatabaseUrlDataSourceConfigTest {

    @Test
    void converteUrlNeonEmCredenciaisJdbc() {
        DatabaseUrlDataSourceConfig.CredenciaisBanco credenciais =
            DatabaseUrlDataSourceConfig.converter(
                "postgresql://smart_user:senha%2Bsegura@db.example.com/neondb"
                    + "?sslmode=require&channel_binding=require"
            );

        assertThat(credenciais.jdbcUrl()).isEqualTo(
            "jdbc:postgresql://db.example.com/neondb"
                + "?sslmode=require&channelBinding=require"
        );
        assertThat(credenciais.usuario()).isEqualTo("smart_user");
        assertThat(credenciais.senha()).isEqualTo("senha+segura");
    }

    @Test
    void rejeitaUrlQueNaoSejaPostgresql() {
        assertThatThrownBy(() -> DatabaseUrlDataSourceConfig.converter(
            "https://usuario:senha@example.com/banco"
        ))
            .isInstanceOf(IllegalStateException.class)
            .hasMessage("DATABASE_URL deve usar PostgreSQL.");
    }
}
