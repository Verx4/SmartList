package br.com.minhalista.encarte;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;

import javax.imageio.ImageIO;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class OcrEncarteService {

    private static final URI GOOGLE_VISION_URI =
        URI.create("https://vision.googleapis.com/v1/images:annotate");

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final String googleVisionApiKey;
    private final int paginasMaximasPdf;

    public OcrEncarteService(
        ObjectMapper objectMapper,
        @Value("${app.ofertas.google-vision-api-key:}") String googleVisionApiKey,
        @Value("${app.ofertas.paginas-maximas-pdf:12}") int paginasMaximasPdf
    ) {
        this.objectMapper = objectMapper;
        this.googleVisionApiKey = googleVisionApiKey;
        this.paginasMaximasPdf = Math.max(1, Math.min(30, paginasMaximasPdf));
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .followRedirects(HttpClient.Redirect.NEVER)
            .build();
    }

    public String extrair(byte[] conteudo, String contentType, TipoEncarte tipo) {
        if (ehPdf(contentType, tipo, conteudo)) {
            return extrairPdf(conteudo);
        }
        validarImagem(conteudo);
        return extrairImagemComVision(conteudo);
    }

    private String extrairPdf(byte[] conteudo) {
        try (PDDocument documento = Loader.loadPDF(conteudo)) {
            PDFTextStripper extrator = new PDFTextStripper();
            extrator.setEndPage(Math.min(documento.getNumberOfPages(), paginasMaximasPdf));
            String textoIncorporado = extrator.getText(documento).trim();
            if (textoIncorporado.length() >= 120) {
                return textoIncorporado;
            }
            if (googleVisionApiKey.isBlank()) {
                throw new IllegalStateException(
                    "O PDF é formado por imagens. Configure GOOGLE_CLOUD_VISION_API_KEY para OCR."
                );
            }

            PDFRenderer renderizador = new PDFRenderer(documento);
            List<String> paginas = new ArrayList<>();
            int limite = Math.min(documento.getNumberOfPages(), paginasMaximasPdf);
            for (int pagina = 0; pagina < limite; pagina++) {
                BufferedImage imagem = renderizador.renderImageWithDPI(
                    pagina,
                    130,
                    ImageType.RGB
                );
                try (ByteArrayOutputStream saida = new ByteArrayOutputStream()) {
                    ImageIO.write(imagem, "jpg", saida);
                    paginas.add(extrairImagemComVision(saida.toByteArray()));
                } finally {
                    imagem.flush();
                }
            }
            return String.join("\n\n--- PÁGINA ---\n\n", paginas);
        } catch (IOException erro) {
            throw new IllegalArgumentException("Não foi possível ler o PDF do encarte.", erro);
        }
    }

    private String extrairImagemComVision(byte[] imagem) {
        if (googleVisionApiKey.isBlank()) {
            throw new IllegalStateException(
                "Configure GOOGLE_CLOUD_VISION_API_KEY para ler encartes em imagem."
            );
        }
        try {
            Map<String, Object> requisicao = Map.of(
                "requests",
                List.of(Map.of(
                    "image",
                    Map.of("content", Base64.getEncoder().encodeToString(imagem)),
                    "features",
                    List.of(Map.of("type", "DOCUMENT_TEXT_DETECTION"))
                ))
            );
            HttpRequest request = HttpRequest.newBuilder(GOOGLE_VISION_URI)
                .timeout(Duration.ofSeconds(45))
                .header("Content-Type", "application/json")
                .header("X-Goog-Api-Key", googleVisionApiKey)
                .POST(HttpRequest.BodyPublishers.ofString(
                    objectMapper.writeValueAsString(requisicao)
                ))
                .build();
            HttpResponse<String> response = httpClient.send(
                request,
                HttpResponse.BodyHandlers.ofString()
            );
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new IllegalStateException(
                    "O serviço de OCR recusou a imagem (HTTP " + response.statusCode() + ")."
                );
            }

            JsonNode raiz = objectMapper.readTree(response.body());
            JsonNode resposta = raiz.path("responses").path(0);
            if (resposta.has("error")) {
                throw new IllegalStateException(
                    "Falha no OCR: " + resposta.path("error").path("message").asText()
                );
            }
            String texto = resposta.path("fullTextAnnotation").path("text").asText("").trim();
            if (texto.isBlank()) {
                texto = resposta.path("textAnnotations").path(0).path("description")
                    .asText("").trim();
            }
            if (texto.isBlank()) {
                throw new IllegalArgumentException("Nenhum texto foi reconhecido no encarte.");
            }
            return texto;
        } catch (InterruptedException erro) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Leitura do encarte interrompida.", erro);
        } catch (IOException erro) {
            throw new IllegalStateException("Falha ao chamar o serviço de OCR.", erro);
        }
    }

    private void validarImagem(byte[] conteudo) {
        try {
            BufferedImage imagem = ImageIO.read(new java.io.ByteArrayInputStream(conteudo));
            if (imagem == null) {
                throw new IllegalArgumentException("A fonte não retornou uma imagem válida.");
            }
            imagem.flush();
        } catch (IOException erro) {
            throw new IllegalArgumentException("Não foi possível ler a imagem do encarte.", erro);
        }
    }

    private boolean ehPdf(String contentType, TipoEncarte tipo, byte[] conteudo) {
        if (tipo == TipoEncarte.PDF) {
            return true;
        }
        if (contentType != null && contentType.toLowerCase().contains("application/pdf")) {
            return true;
        }
        return conteudo.length >= 4
            && conteudo[0] == '%'
            && conteudo[1] == 'P'
            && conteudo[2] == 'D'
            && conteudo[3] == 'F';
    }
}
