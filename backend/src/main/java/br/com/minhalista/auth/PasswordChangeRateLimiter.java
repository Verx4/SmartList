package br.com.minhalista.auth;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayDeque;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import br.com.minhalista.common.RegraNegocioException;

@Component
public class PasswordChangeRateLimiter {

    private final PasswordResetProperties properties;
    private final Map<UUID, ArrayDeque<Instant>> falhasPorUsuario = new HashMap<>();

    public PasswordChangeRateLimiter(PasswordResetProperties properties) {
        this.properties = properties;
    }

    public synchronized void verificarPermitido(UUID usuarioId) {
        ArrayDeque<Instant> falhas = falhasAtuais(usuarioId);
        if (falhas.size() >= properties.getMaxFalhasAlteracaoSenha()) {
            throw new RegraNegocioException(
                HttpStatus.TOO_MANY_REQUESTS,
                "Muitas tentativas de alteração de senha. Aguarde alguns minutos e tente novamente."
            );
        }
    }

    public synchronized void registrarFalha(UUID usuarioId) {
        falhasAtuais(usuarioId).addLast(Instant.now());
    }

    public synchronized void limpar(UUID usuarioId) {
        falhasPorUsuario.remove(usuarioId);
    }

    private ArrayDeque<Instant> falhasAtuais(UUID usuarioId) {
        ArrayDeque<Instant> falhas = falhasPorUsuario.computeIfAbsent(
            usuarioId,
            ignorado -> new ArrayDeque<>()
        );
        Instant limite = Instant.now().minus(
            properties.getJanelaAlteracaoSenhaMinutos(),
            ChronoUnit.MINUTES
        );
        while (!falhas.isEmpty() && falhas.peekFirst().isBefore(limite)) {
            falhas.removeFirst();
        }
        return falhas;
    }
}
