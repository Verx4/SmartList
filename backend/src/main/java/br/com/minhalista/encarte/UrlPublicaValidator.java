package br.com.minhalista.encarte;

import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;
import java.util.Set;

import org.springframework.stereotype.Component;

@Component
public class UrlPublicaValidator {

    private static final Set<String> HOSTS_LOCAIS = Set.of(
        "localhost",
        "localhost.localdomain"
    );

    public URI validar(String valor) {
        URI uri;
        try {
            uri = URI.create(valor == null ? "" : valor.trim());
        } catch (IllegalArgumentException erro) {
            throw new IllegalArgumentException("URL da fonte inválida.", erro);
        }

        String esquema = uri.getScheme();
        String host = uri.getHost();
        if (esquema == null
            || (!"https".equalsIgnoreCase(esquema) && !"http".equalsIgnoreCase(esquema))
            || host == null
            || host.isBlank()
            || uri.getUserInfo() != null
            || HOSTS_LOCAIS.contains(host.toLowerCase())) {
            throw new IllegalArgumentException("A fonte precisa usar uma URL pública HTTP ou HTTPS.");
        }

        try {
            for (InetAddress endereco : InetAddress.getAllByName(host)) {
                if (endereco.isAnyLocalAddress()
                    || endereco.isLoopbackAddress()
                    || endereco.isLinkLocalAddress()
                    || endereco.isSiteLocalAddress()
                    || endereco.isMulticastAddress()) {
                    throw new IllegalArgumentException(
                        "Endereços internos ou locais não podem ser usados como fonte."
                    );
                }
            }
        } catch (UnknownHostException erro) {
            throw new IllegalArgumentException("O domínio da fonte não pôde ser localizado.", erro);
        }
        return uri;
    }
}
