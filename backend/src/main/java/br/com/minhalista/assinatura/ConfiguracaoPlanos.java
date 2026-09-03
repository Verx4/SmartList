package br.com.minhalista.assinatura;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "configuracao_planos")
public class ConfiguracaoPlanos {
    @Id
    private Integer id;

    @Column(name = "exibir_cupons", nullable = false)
    private boolean exibirCupons = true;

    protected ConfiguracaoPlanos() {}

    public ConfiguracaoPlanos(Integer id, boolean exibirCupons) {
        this.id = id;
        this.exibirCupons = exibirCupons;
    }

    public Integer getId() { return id; }
    public boolean isExibirCupons() { return exibirCupons; }
    public void setExibirCupons(boolean exibirCupons) { this.exibirCupons = exibirCupons; }
}
