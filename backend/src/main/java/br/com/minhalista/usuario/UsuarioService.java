package br.com.minhalista.usuario;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import br.com.minhalista.common.RegraNegocioException;

@Service
public class UsuarioService {

    private final UsuarioRepository repository;

    public UsuarioService(UsuarioRepository repository) {
        this.repository = repository;
    }

    public Usuario obterAutenticado() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();

        return repository.findByEmailIgnoreCase(email)
            .orElseThrow(() -> new RegraNegocioException(
                HttpStatus.UNAUTHORIZED,
                "Usuário autenticado não foi encontrado."
            ));
    }

    public void exigirPremium(Usuario usuario) {
        if (!usuario.temAcessoPremium()) {
            throw new RegraNegocioException(
                HttpStatus.FORBIDDEN,
                "Este recurso faz parte do plano Premium."
            );
        }
    }
}
