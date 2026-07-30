package br.com.minhalista.encarte;

import java.util.List;

import org.springframework.stereotype.Service;

@Service
public class ExtratorOfertaService {

    private final OpenAiOfertaExtractor openAiExtractor;
    private final ExtratorHeuristicoOferta extratorHeuristico;

    public ExtratorOfertaService(
        OpenAiOfertaExtractor openAiExtractor,
        ExtratorHeuristicoOferta extratorHeuristico
    ) {
        this.openAiExtractor = openAiExtractor;
        this.extratorHeuristico = extratorHeuristico;
    }

    public List<OfertaExtraida> extrair(String textoOcr) {
        if (openAiExtractor.configurado()) {
            try {
                List<OfertaExtraida> ofertas = openAiExtractor.extrair(textoOcr);
                if (!ofertas.isEmpty()) {
                    return ofertas;
                }
            } catch (RuntimeException _erro) {
                // O fallback local mantém a captura operacional sem publicar imagens.
            }
        }
        return extratorHeuristico.extrair(textoOcr);
    }
}
