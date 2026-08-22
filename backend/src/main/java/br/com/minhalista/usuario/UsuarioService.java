package br.com.minhalista.usuario;

import java.util.Locale;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.minhalista.assinatura.AssinaturaValidadeService;
import br.com.minhalista.common.RegraNegocioException;

@Service
public class UsuarioService {

    private final UsuarioRepository repository;
    private final AssinaturaValidadeService assinaturaValidadeService;

    public UsuarioService(
        UsuarioRepository repository,
        AssinaturaValidadeService assinaturaValidadeService
    ) {
        this.repository = repository;
        this.assinaturaValidadeService = assinaturaValidadeService;
    }

    public Usuario obterAutenticado() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();

        return repository.findByEmailIgnoreCase(email)
            .orElseThrow(() -> new RegraNegocioException(
                HttpStatus.UNAUTHORIZED,
                "Usuário autenticado não foi encontrado."
            ));
    }

    @Transactional
    public Usuario consultarPerfil() {
        Usuario usuario = obterAutenticado();
        assinaturaValidadeService.sincronizarUsuario(usuario);
        return usuario;
    }

    @Transactional
    public Usuario atualizarPerfil(AtualizarUsuarioRequest request) {
        Usuario usuario = obterAutenticado();

        usuario.setNome(request.nome().trim());
        usuario.setTelefone(limparOpcional(request.telefone()));
        usuario.setCidade(limparOpcional(request.cidade()));
        usuario.setEstado(request.estado() == null || request.estado().isBlank()
            ? null
            : request.estado().trim().toUpperCase(Locale.ROOT));
        usuario.setNotificarPromocoes(request.notificarPromocoes());
        usuario.setNotificarPrecos(request.notificarPrecos());

        return repository.save(usuario);
    }

    public void exigirPremium(Usuario usuario) {
        assinaturaValidadeService.sincronizarUsuario(usuario);

        if (!usuario.temAcessoPremium()) {
            throw new RegraNegocioException(
                HttpStatus.FORBIDDEN,
                "Este recurso faz parte do plano Premium."
            );
        }
    }

    private String limparOpcional(String valor) {
        if (valor == null || valor.isBlank()) {
            return null;
        }

        return valor.trim();
    }
}
