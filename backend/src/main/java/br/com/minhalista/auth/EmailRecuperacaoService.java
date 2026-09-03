package br.com.minhalista.auth;

import java.nio.charset.StandardCharsets;

import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.HtmlUtils;

import jakarta.mail.internet.MimeMessage;

@Service
public class EmailRecuperacaoService {

    private final JavaMailSender mailSender;
    private final PasswordResetProperties properties;

    public EmailRecuperacaoService(
        JavaMailSender mailSender,
        PasswordResetProperties properties
    ) {
        this.mailSender = mailSender;
        this.properties = properties;
    }

    public boolean disponivel() {
        return properties.isEmailEnabled()
            && properties.getEmailFrom() != null
            && !properties.getEmailFrom().isBlank();
    }

    public void enviarCodigo(String destino, String nome, String codigo) {
        try {
            MimeMessage mensagem = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(
                mensagem,
                false,
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
            throw new IllegalStateException("Falha ao enviar e-mail de recuperação.", erro);
        }
    }
}
