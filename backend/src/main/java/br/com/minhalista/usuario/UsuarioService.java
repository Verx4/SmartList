package br.com.minhalista.usuario;

import java.util.Locale;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.minhalista.assinatura.AssinaturaValidadeService;
import br.com.minhalista.common.RegraNegocioException;

@Service
public class UsuarioService {

    private static final Logger LOGGER = LoggerFactory.getLogger(UsuarioService.class);

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

    public Usuario consultarPerfil() {
        Usuario usuario = obterAutenticado();
        sincronizarAssinaturaSemBloquearPerfil(usuario);
        return usuario;
    }

    @Transactional(readOnly = true)
    public CpfPerfilResponse consultarCpf() {
        return CpfPerfilResponse.de(obterAutenticado());
    }

    @Transactional
    public CpfPerfilResponse atualizarCpf(AtualizarCpfRequest request) {
        Usuario usuario = obterAutenticado();
        if (!Cpf.valido(request.cpf())) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "Informe um CPF válido.");
        }

        String cpf = Cpf.somenteDigitos(request.cpf());

        if (!cpf.equals(usuario.getCpf()) && repository.existsByCpf(cpf)) {
            throw new RegraNegocioException(HttpStatus.CONFLICT, "Este CPF já está cadastrado.");
        }

        usuario.setCpf(cpf);
        repository.saveAndFlush(usuario);
        return CpfPerfilResponse.de(usuario);
    }

    private void sincronizarAssinaturaSemBloquearPerfil(Usuario usuario) {
        try {
            assinaturaValidadeService.sincronizarUsuario(usuario);
        } catch (RuntimeException erro) {
            LOGGER.error(
                "Falha ao sincronizar a assinatura durante a consulta do perfil do usuário {}.",
                usuario.getId(),
                erro
            );
        }
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
