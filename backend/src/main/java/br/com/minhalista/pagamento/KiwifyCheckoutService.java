package br.com.minhalista.pagamento;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.EnumMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import br.com.minhalista.assinatura.Assinatura;
import br.com.minhalista.assinatura.CicloAssinatura;
import br.com.minhalista.common.RegraNegocioException;

@Service
public class KiwifyCheckoutService {

    private final Map<CicloAssinatura, String> checkoutUrls =
        new EnumMap<>(CicloAssinatura.class);

    public KiwifyCheckoutService(
        @Value("${app.kiwify.checkout.mensal:https://pay.kiwify.com.br/CsdUxeJ}") String mensal,
        @Value("${app.kiwify.checkout.trimestral:https://pay.kiwify.com.br/sd2O7Hi}") String trimestral,
        @Value("${app.kiwify.checkout.anual:https://pay.kiwify.com.br/FOP3RIc}") String anual
    ) {
        checkoutUrls.put(CicloAssinatura.MENSAL, validarUrl(mensal));
        checkoutUrls.put(CicloAssinatura.TRIMESTRAL, validarUrl(trimestral));
        checkoutUrls.put(CicloAssinatura.ANUAL, validarUrl(anual));
    }

    public CheckoutResponse criarCheckout(Assinatura assinatura) {
        String base = checkoutUrls.get(assinatura.getCiclo());
        if (!StringUtils.hasText(base)) {
            throw new RegraNegocioException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "O checkout deste plano ainda não foi configurado na Kiwify."
            );
        }

        String separador = base.contains("?") ? "&" : "?";
        String url = base + separador
            + "s1=" + URLEncoder.encode(
                assinatura.getId().toString(),
                StandardCharsets.UTF_8
            )
            + "&region=br"
            + parametroCupom(assinatura.getCupomCodigo());

        return new CheckoutResponse(
            "kiwify:" + assinatura.getId(),
            url,
            url,
            url
        );
    }

    private String parametroCupom(String codigo) {
        if (!StringUtils.hasText(codigo)) {
            return "";
        }
        return "&coupon=" + URLEncoder.encode(
            codigo.trim().toUpperCase(),
            StandardCharsets.UTF_8
        );
    }

    private String validarUrl(String valor) {
        if (!StringUtils.hasText(valor)) {
            return "";
        }
        URI uri = URI.create(valor.trim());
        if (!"https".equalsIgnoreCase(uri.getScheme())
            || !"pay.kiwify.com.br".equalsIgnoreCase(uri.getHost())) {
            throw new IllegalStateException(
                "O checkout da Kiwify deve usar https://pay.kiwify.com.br."
            );
        }
        return uri.toString();
    }
}
