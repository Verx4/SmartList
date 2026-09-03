package br.com.minhalista.auth;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.password-reset")
public class PasswordResetProperties {

    private boolean emailEnabled;
    private String emailFrom = "";
    private String pepper = "";
    private int codigoExpiracaoMinutos = 10;
    private int maxTentativasCodigo = 5;
    private int maxSolicitacoesPorEmail = 3;
    private int maxSolicitacoesPorIp = 10;
    private int janelaSolicitacoesMinutos = 30;
    private int intervaloReenvioSegundos = 60;
    private int maxFalhasAlteracaoSenha = 5;
    private int janelaAlteracaoSenhaMinutos = 15;

    public boolean isEmailEnabled() { return emailEnabled; }
    public void setEmailEnabled(boolean emailEnabled) { this.emailEnabled = emailEnabled; }
    public String getEmailFrom() { return emailFrom; }
    public void setEmailFrom(String emailFrom) { this.emailFrom = emailFrom; }
    public String getPepper() { return pepper; }
    public void setPepper(String pepper) { this.pepper = pepper; }
    public int getCodigoExpiracaoMinutos() { return codigoExpiracaoMinutos; }
    public void setCodigoExpiracaoMinutos(int valor) { codigoExpiracaoMinutos = valor; }
    public int getMaxTentativasCodigo() { return maxTentativasCodigo; }
    public void setMaxTentativasCodigo(int valor) { maxTentativasCodigo = valor; }
    public int getMaxSolicitacoesPorEmail() { return maxSolicitacoesPorEmail; }
    public void setMaxSolicitacoesPorEmail(int valor) { maxSolicitacoesPorEmail = valor; }
    public int getMaxSolicitacoesPorIp() { return maxSolicitacoesPorIp; }
    public void setMaxSolicitacoesPorIp(int valor) { maxSolicitacoesPorIp = valor; }
    public int getJanelaSolicitacoesMinutos() { return janelaSolicitacoesMinutos; }
    public void setJanelaSolicitacoesMinutos(int valor) { janelaSolicitacoesMinutos = valor; }
    public int getIntervaloReenvioSegundos() { return intervaloReenvioSegundos; }
    public void setIntervaloReenvioSegundos(int valor) { intervaloReenvioSegundos = valor; }
    public int getMaxFalhasAlteracaoSenha() { return maxFalhasAlteracaoSenha; }
    public void setMaxFalhasAlteracaoSenha(int valor) { maxFalhasAlteracaoSenha = valor; }
    public int getJanelaAlteracaoSenhaMinutos() { return janelaAlteracaoSenhaMinutos; }
    public void setJanelaAlteracaoSenhaMinutos(int valor) { janelaAlteracaoSenhaMinutos = valor; }
}
