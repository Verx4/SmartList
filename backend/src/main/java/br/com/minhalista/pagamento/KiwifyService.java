package br.com.minhalista.pagamento;

import java.net.URI;
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
public class KiwifyService {

    private final Map<CicloAssinatura, String> checkoutUrls =
        new EnumMap<>(CicloAssinatura.class);

    public KiwifyService(
        @Value("${app.kiwify.checkout.mensal:https://pay.kiwify.com.br/CsdUxeJ}") String mensal,
        @Value("${app.kiwify.checkout.trimestral:https://pay.kiwify.com.br/sd2O7Hi}") String trimestral,
        @Value("${app.kiwify.checkout.anual:https://pay.kiwify.com.br/FOP3RIc}") String anual
    ) {
        checkoutUrls.put(CicloAssinatura.MENSAL, validarUrl(mensal));
        checkoutUrls.put(CicloAssinatura.TRIMESTRAL, validarUrl(trimestral));
        checkoutUrls.put(CicloAssinatura.ANUAL, validarUrl(anual));
    }

    public CheckoutResponse criarCheckout(Assinatura assinatura) {
        if (StringUtils.hasText(assinatura.getCupomCodigo())) {
            throw new RegraNegocioException(
                HttpStatus.BAD_REQUEST,
                "Cupons estão temporariamente indisponíveis no checkout da Kiwify."
            );
        }

        String checkoutUrl = checkoutUrls.get(assinatura.getCiclo());

        if (!StringUtils.hasText(checkoutUrl)) {
            throw new RegraNegocioException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "O checkout deste plano ainda não foi configurado na Kiwify."
            );
        }

        String referencia = "kiwify:" + assinatura.getId();
        return new CheckoutResponse(
            referencia,
            checkoutUrl,
            checkoutUrl,
            checkoutUrl
        );
    }

    private String validarUrl(String valor) {
        if (!StringUtils.hasText(valor)) {
            return "";
        }

        URI uri;

        try {
            uri = URI.create(valor.trim());
        } catch (IllegalArgumentException erro) {
            throw new IllegalStateException("URL de checkout da Kiwify inválida.", erro);
        }

        if (!"https".equalsIgnoreCase(uri.getScheme())
            || !"pay.kiwify.com.br".equalsIgnoreCase(uri.getHost())) {
            throw new IllegalStateException(
                "O checkout da Kiwify deve usar https://pay.kiwify.com.br."
            );
        }

        return uri.toString();
    }
}
