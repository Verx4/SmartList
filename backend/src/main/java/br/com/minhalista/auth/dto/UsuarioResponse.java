package br.com.minhalista.auth.dto;
import java.util.UUID;
import br.com.minhalista.usuario.Usuario;
public record UsuarioResponse(UUID id,String nome,String email,String telefone,String cidade,String estado,String fotoPerfil,boolean notificarPromocoes,boolean notificarPrecos,String perfil,String tipoAcesso,boolean ativo,boolean assinaturaAtiva){
 public static UsuarioResponse de(Usuario u){return new UsuarioResponse(u.getId(),u.getNome(),u.getEmail(),u.getTelefone(),u.getCidade(),u.getEstado(),u.getFotoPerfil(),u.isNotificarPromocoes(),u.isNotificarPrecos(),u.getPerfil().name(),u.getTipoAcesso().name(),u.isAtivo(),u.temAcessoPremium());}
}
