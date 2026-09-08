package br.com.minhalista.auth;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.util.HtmlUtils;

import jakarta.mail.internet.MimeMessage;

@Service
public class EmailRecuperacaoService {

    private static final Logger LOGGER = LoggerFactory.getLogger(
        EmailRecuperacaoService.class
    );

    private final JavaMailSender mailSender;
    private final PasswordResetProperties properties;
    private final String host;
    private final int port;
    private final String usuario;
    private final String senha;
    private final boolean autenticacao;
    private final boolean startTls;
    private final boolean ssl;

    public EmailRecuperacaoService(
        JavaMailSender mailSender,
        PasswordResetProperties properties,
        @Value("${spring.mail.host:}") String host,
        @Value("${spring.mail.port:0}") int port,
        @Value("${spring.mail.username:}") String usuario,
        @Value("${spring.mail.password:}") String senha,
        @Value("${EMAIL_SMTP_AUTH:true}") boolean autenticacao,
        @Value("${EMAIL_STARTTLS:true}") boolean startTls,
        @Value("${EMAIL_SSL_ENABLE:false}") boolean ssl
    ) {
        this.mailSender = mailSender;
        this.properties = properties;
        this.host = host;
        this.port = port;
        this.usuario = usuario;
        this.senha = senha;
        this.autenticacao = autenticacao;
        this.startTls = startTls;
        this.ssl = ssl;
    }

    public boolean disponivel() {
        return properties.isEmailEnabled() && variaveisAusentes().isEmpty();
    }

    @EventListener(ApplicationReadyEvent.class)
    public void verificarConexaoAoIniciar() {
        List<String> ausentes = variaveisAusentes();

        if (!properties.isEmailEnabled()) {
            LOGGER.warn(
                "Recuperação de senha por e-mail desativada: MAIL_ENABLED=false. "
                    + "Variáveis SMTP ausentes: {}.",
                descreverAusentes(ausentes)
            );
            return;
        }

        if (!ausentes.isEmpty()) {
            LOGGER.error(
                "Recuperação de senha por e-mail indisponível. "
                    + "Cadastre no ambiente de produção: {}.",
                String.join(", ", ausentes)
            );
            return;
        }

        if (!(mailSender instanceof JavaMailSenderImpl sender)) {
            LOGGER.warn(
                "Não foi possível executar o teste SMTP na inicialização: "
                    + "a implementação de JavaMailSender não oferece testConnection()."
            );
            return;
        }

        try {
            sender.testConnection();
            LOGGER.info(
                "Conexão SMTP validada com sucesso em {}:{} "
                    + "(STARTTLS={}, SSL={}, autenticação={}).",
                host,
                port,
                startTls,
                ssl,
                autenticacao
            );
        } catch (Exception erro) {
            Throwable causa = causaRaiz(erro);
            LOGGER.error(
                "Falha no teste SMTP ao iniciar. tipo={}, motivo={}",
                causa.getClass().getSimpleName(),
                resumirMensagem(causa.getMessage())
            );
        }
    }

    public void enviarCodigo(String destino, String nome, String codigo) {
        if (!disponivel()) {
            throw new IllegalStateException(
                "Serviço de e-mail não configurado. Verifique os logs de inicialização."
            );
        }

        try {
            MimeMessage mensagem = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(
                mensagem,
                true,
                StandardCharsets.UTF_8.name()
            );

            String nomeSeguro = HtmlUtils.htmlEscape(
                nome == null || nome.isBlank() ? "" : " " + nome.trim()
            );
            String texto = "Olá" + (nomeSeguro.isBlank() ? "," : " " + nome.trim() + ",")
                + "\n\nRecebemos uma solicitação para redefinir a senha da sua conta no Smart List."
                + "\n\nSeu código de recuperação é: " + codigo
                + "\n\nEste código é válido por "
                + properties.getCodigoExpiracaoMinutos()
                + " minutos e pode ser utilizado apenas uma vez."
                + "\n\nSe você não solicitou a recuperação da senha, ignore este e-mail."
                + "\n\nSmart List";
            String html = """
                <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px;color:#e5edf8;background:#07182d;border-radius:18px">
                  <h1 style="margin:0 0 20px;color:#ffffff;font-size:26px">Smart <span style="color:#22c55e">List</span></h1>
                  <p>Olá%s,</p>
                  <p style="line-height:1.6">Recebemos uma solicitação para redefinir a senha da sua conta no Smart List.</p>
                  <p style="margin:26px 0 8px">Seu código de recuperação é:</p>
                  <div style="padding:18px;text-align:center;font-size:32px;font-weight:800;letter-spacing:8px;color:#ffffff;background:#12243d;border:1px solid #60a5fa;border-radius:12px">%s</div>
                  <p style="line-height:1.6;color:#b7c5d8">Este código é válido por %d minutos e pode ser utilizado apenas uma vez.</p>
                  <p style="line-height:1.6;color:#b7c5d8">Se você não solicitou a recuperação da senha, ignore este e-mail.</p>
                  <p style="margin-top:26px">Smart List</p>
                </div>
                """.formatted(
                    nomeSeguro,
                    codigo,
                    properties.getCodigoExpiracaoMinutos()
                );

            helper.setFrom(properties.getEmailFrom(), "Smart List");
            helper.setTo(destino);
            helper.setSubject("Recuperação de senha — Smart List");
            helper.setText(texto, html);
            mailSender.send(mensagem);
        } catch (Exception erro) {
            Throwable causa = causaRaiz(erro);
            LOGGER.error(
                "Falha no envio do e-mail de recuperação. tipo={}, motivo={}",
                causa.getClass().getSimpleName(),
                resumirMensagem(causa.getMessage())
            );
            throw new IllegalStateException("Falha ao enviar e-mail de recuperação.", erro);
        }
    }

    private List<String> variaveisAusentes() {
        List<String> ausentes = new ArrayList<>();
        if (!StringUtils.hasText(host)) ausentes.add("EMAIL_HOST");
        if (port < 1 || port > 65_535) ausentes.add("EMAIL_PORT");
        if (autenticacao && !StringUtils.hasText(usuario)) ausentes.add("EMAIL_USER");
        if (autenticacao && !StringUtils.hasText(senha)) ausentes.add("EMAIL_PASSWORD");
        if (!StringUtils.hasText(properties.getEmailFrom())) ausentes.add("EMAIL_FROM");
        return ausentes;
    }

    private String descreverAusentes(List<String> ausentes) {
        return ausentes.isEmpty() ? "nenhuma" : String.join(", ", ausentes);
    }

    private Throwable causaRaiz(Throwable erro) {
        Throwable atual = erro;
        while (atual.getCause() != null && atual.getCause() != atual) {
            atual = atual.getCause();
        }
        return atual;
    }

    private String resumirMensagem(String mensagem) {
        if (!StringUtils.hasText(mensagem)) return "sem detalhe fornecido pelo servidor SMTP";
        String normalizada = mensagem.replace('\r', ' ').replace('\n', ' ').trim();
        return normalizada.length() <= 400
            ? normalizada
            : normalizada.substring(0, 400) + "…";
    }
}
