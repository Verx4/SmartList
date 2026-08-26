package br.com.minhalista.config;

import java.io.IOException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import br.com.minhalista.auth.JwtService;
import br.com.minhalista.usuario.UsuarioRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UsuarioRepository usuarioRepository;

    public JwtAuthenticationFilter(JwtService jwtService, UsuarioRepository usuarioRepository) {
        this.jwtService = jwtService;
        this.usuarioRepository = usuarioRepository;
    }

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        String authorization = request.getHeader(HttpHeaders.AUTHORIZATION);

        if (StringUtils.hasText(authorization)
            && authorization.startsWith("Bearer ")
            && SecurityContextHolder.getContext().getAuthentication() == null) {
            try {
                String token = authorization.substring(7);
                String email = jwtService.extrairEmail(token);

                usuarioRepository.findByEmailIgnoreCase(email)
                    .filter(usuarioAtivo -> usuarioAtivo.isAtivo())
                    .ifPresent(usuario -> {
                        UsernamePasswordAuthenticationToken autenticacao =
                            new UsernamePasswordAuthenticationToken(
                                usuario,
                                null,
                                usuario.getAuthorities()
                            );

                        autenticacao.setDetails(
                            new WebAuthenticationDetailsSource().buildDetails(request)
                        );

                        SecurityContextHolder.getContext().setAuthentication(autenticacao);
                        registrarAtividade(usuario.getId(), usuario.getUltimoAcessoEm());
                    });
            } catch (RuntimeException ignored) {
                SecurityContextHolder.clearContext();
            }
        }

        filterChain.doFilter(request, response);
    }

    private void registrarAtividade(java.util.UUID usuarioId, Instant ultimoAcessoEm) {
        Instant agora = Instant.now();
        Instant limite = agora.minus(1, ChronoUnit.HOURS);

        if (ultimoAcessoEm != null && ultimoAcessoEm.isAfter(limite)) {
            return;
        }

        try {
            usuarioRepository.registrarAtividadeSeNecessario(usuarioId, agora, limite);
        } catch (RuntimeException ignored) {
            // A telemetria de uso não pode interromper uma requisição autenticada.
        }
    }
}
