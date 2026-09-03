package br.com.minhalista.usuario;
import java.util.Map;
import org.springframework.web.bind.annotation.*;
import br.com.minhalista.auth.dto.UsuarioResponse; import jakarta.validation.Valid;
@RestController @RequestMapping("/api/usuarios") public class UsuarioController {
 private final UsuarioService service; public UsuarioController(UsuarioService service){this.service=service;}
 @GetMapping("/me") public UsuarioResponse consultarPerfil(){return UsuarioResponse.de(service.consultarPerfil());}
 @PutMapping("/me") public UsuarioResponse atualizarPerfil(@Valid @RequestBody AtualizarUsuarioRequest request){return UsuarioResponse.de(service.atualizarPerfil(request));}
 @GetMapping("/me/cpf") public CpfPerfilResponse consultarCpf(){return service.consultarCpf();}
 @PutMapping("/me/cpf") public CpfPerfilResponse atualizarCpf(@Valid @RequestBody AtualizarCpfRequest request){return service.atualizarCpf(request);}
 @PutMapping("/me/senha") public Map<String,String> alterarSenha(@Valid @RequestBody AlterarSenhaRequest request){service.alterarSenha(request);return Map.of("mensagem","Senha alterada com sucesso.");}
 @PutMapping("/me/foto") public UsuarioResponse atualizarFoto(@RequestBody Map<String,String> body){return UsuarioResponse.de(service.atualizarFotoPerfil(body.get("foto")));}
 @DeleteMapping("/me/foto") public UsuarioResponse removerFoto(){return UsuarioResponse.de(service.removerFotoPerfil());}
 @PostMapping("/me/solicitacoes/exclusao") public Map<String,String> solicitarExclusao(){service.solicitarExclusaoEAnonimizacao();return Map.of("status","excluida","mensagem","Seus dados foram apagados do sistema. Muito obrigado por usar o Smart List. Esperamos ter você de volta em breve.");}
}
