package br.com.minhalista.sugestao;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import br.com.minhalista.usuario.Usuario;
import br.com.minhalista.usuario.UsuarioRepository;

import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
public class SugestaoService {

    private final SugestaoRepository repository;
    private final UsuarioRepository usuarioRepository;

    public SugestaoService(
        SugestaoRepository repository,
        UsuarioRepository usuarioRepository
    ) {
        this.repository = repository;
        this.usuarioRepository = usuarioRepository;
    }

    @Transactional(readOnly = true)
    public List<SugestaoResponse> listar() {
        return repository.findAllByOrderByCriadoEmDesc()
            .stream()
            .map(SugestaoResponse::de)
            .toList();
    }

    @Transactional
    public SugestaoResponse criar(String email, SugestaoRequest request) {
        Usuario usuario = usuarioRepository.findByEmailIgnoreCase(email)
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Usuário não encontrado."));

        Sugestao sugestao = new Sugestao();
        sugestao.setUsuarioNome(usuario.getNome());
        sugestao.setUsuarioEmail(usuario.getEmail());
        sugestao.setCategoria(request.categoria().trim());
        sugestao.setTitulo(request.titulo().trim());
        sugestao.setDescricao(request.descricao().trim());

        return SugestaoResponse.de(repository.save(sugestao));
    }

    @Transactional
    public SugestaoResponse votar(UUID id) {
        Sugestao sugestao = buscar(id);
        sugestao.setVotos(sugestao.getVotos() + 1);
        return SugestaoResponse.de(repository.save(sugestao));
    }

    @Transactional
    public SugestaoResponse atualizarStatus(UUID id, SugestaoStatus status) {
        Sugestao sugestao = buscar(id);
        sugestao.setStatus(status);
        return SugestaoResponse.de(repository.save(sugestao));
    }

    private Sugestao buscar(UUID id) {
        return repository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Sugestão não encontrada."));
    }
}
