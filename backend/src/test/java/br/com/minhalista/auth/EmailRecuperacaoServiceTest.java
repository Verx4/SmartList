package br.com.minhalista.auth;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import org.junit.jupiter.api.Test;
import org.springframework.mail.javamail.JavaMailSenderImpl;

class EmailRecuperacaoServiceTest {

    @Test
    void deveFicarIndisponivelQuandoCredenciaisEstaoAusentes() {
        PasswordResetProperties properties = propriedadesAtivas();
        EmailRecuperacaoService service = new EmailRecuperacaoService(
            new JavaMailSenderImpl(),
            properties,
            "smtp.gmail.com",
            587,
            "",
            "",
            true,
            true,
            false
        );

        assertFalse(service.disponivel());
    }

    @Test
    void deveFicarDisponivelComConfiguracaoSmtpCompleta() {
        EmailRecuperacaoService service = new EmailRecuperacaoService(
            new JavaMailSenderImpl(),
            propriedadesAtivas(),
            "smtp.gmail.com",
            587,
            "conta@smartlist.test",
            "senha-de-aplicativo",
            true,
            true,
            false
        );

        assertTrue(service.disponivel());
    }

    @Test
    void naoDeveTestarConexaoQuandoEnvioEstaDesativado() throws Exception {
        JavaMailSenderImpl sender = org.mockito.Mockito.mock(JavaMailSenderImpl.class);
        PasswordResetProperties properties = propriedadesAtivas();
        properties.setEmailEnabled(false);
        EmailRecuperacaoService service = new EmailRecuperacaoService(
            sender,
            properties,
            "smtp.gmail.com",
            587,
            "conta@smartlist.test",
            "senha-de-aplicativo",
            true,
            true,
            false
        );

        service.verificarConexaoAoIniciar();

        verify(sender, never()).testConnection();
    }

    @Test
    void deveTestarConexaoQuandoConfiguracaoEstaCompleta() throws Exception {
        JavaMailSenderImpl sender = org.mockito.Mockito.mock(JavaMailSenderImpl.class);
        EmailRecuperacaoService service = new EmailRecuperacaoService(
            sender,
            propriedadesAtivas(),
            "smtp.gmail.com",
            587,
            "conta@smartlist.test",
            "senha-de-aplicativo",
            true,
            true,
            false
        );

        service.verificarConexaoAoIniciar();

        verify(sender).testConnection();
    }

    private PasswordResetProperties propriedadesAtivas() {
        PasswordResetProperties properties = new PasswordResetProperties();
        properties.setEmailEnabled(true);
        properties.setEmailFrom("naoresponda@smartlist.test");
        return properties;
    }
}
