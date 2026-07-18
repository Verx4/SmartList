package br.com.minhalista.mercado;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.minhalista.common.RegraNegocioException;
import br.com.minhalista.usuario.Usuario;
import br.com.minhalista.usuario.UsuarioService;

@Service
public class MercadoService {

    private static final List<String> MERCADOS_INICIAIS = List.of(
        "Assaí",
        "Atacadão",
        "Novo Atacarejo"
    );

    private final MercadoRepository repository;
    private final UsuarioService usuarioService;

    public MercadoService(MercadoRepository repository, UsuarioService usuarioService) {
        this.repository = repository;
        this.usuarioService = usuarioService;
    }

    @Transactional
    public List<MercadoResponse> listar() {
        Usuario usuario = usuarioService.obterAutenticado();
        List<Mercado> mercados = repository.findByUsuarioIdOrderByFavoritoDescNomeAsc(usuario.getId());

        if (mercados.isEmpty()) {
            for (String nome : MERCADOS_INICIAIS) {
                Mercado mercado = new Mercado();
                mercado.setUsuario(usuario);
                mercado.setNome(nome);
                mercado.setAtivo(true);
                repository.save(mercado);
            }

            mercados = repository.findByUsuarioIdOrderByFavoritoDescNomeAsc(usuario.getId());
        }

        return mercados.stream().map(MercadoResponse::de).toList();
    }

    @Transactional
    public MercadoResponse adicionar(MercadoRequest request) {
        Usuario usuario = usuarioService.obterAutenticado();
        String nome = request.nome().trim();

        if (repository.existsByUsuarioIdAndNomeIgnoreCase(usuario.getId(), nome)) {
            throw new RegraNegocioException(HttpStatus.CONFLICT, "Este mercado já está na sua lista.");
        }

        Mercado mercado = new Mercado();
        mercado.setUsuario(usuario);
        preencher(mercado, request);

        return MercadoResponse.de(repository.save(mercado));
    }

    @Transactional
    public MercadoResponse atualizar(UUID id, MercadoRequest request) {
        Usuario usuario = usuarioService.obterAutenticado();
        Mercado mercado = obterDoUsuario(id, usuario);

        preencher(mercado, request);
        return MercadoResponse.de(repository.save(mercado));
    }

    @Transactional
    public MercadoResponse favoritar(UUID id, FavoritoRequest request) {
        Usuario usuario = usuarioService.obterAutenticado();
        Mercado mercado = obterDoUsuario(id, usuario);
        mercado.setFavorito(Boolean.TRUE.equals(request.favorito()));
        return MercadoResponse.de(repository.save(mercado));
    }

    @Transactional
    public void remover(UUID id) {
        Usuario usuario = usuarioService.obterAutenticado();
        repository.delete(obterDoUsuario(id, usuario));
    }

    public Mercado obterDoUsuario(UUID id, Usuario usuario) {
        return repository.findByIdAndUsuarioId(id, usuario.getId())
            .orElseThrow(() -> new RegraNegocioException(HttpStatus.NOT_FOUND, "Mercado não encontrado."));
    }

    private void preencher(Mercado mercado, MercadoRequest request) {
        mercado.setNome(request.nome().trim());
        mercado.setCidade(limpar(request.cidade()));
        mercado.setEstado(request.estado() == null
            ? null
            : request.estado().trim().toUpperCase(Locale.ROOT));
        mercado.setLatitude(request.latitude());
        mercado.setLongitude(request.longitude());
        mercado.setFavorito(Boolean.TRUE.equals(request.favorito()));
        mercado.setAtivo(true);
    }

    private String limpar(String texto) {
        if (texto == null || texto.isBlank()) {
            return null;
        }

        return texto.trim();
    }
}
