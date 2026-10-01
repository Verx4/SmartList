package br.com.minhalista.voz;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Service
public class TranscricaoVozService {

    private static final URI API_URI = URI.create("https://api.openai.com/v1/audio/transcriptions");
    private static final long TAMANHO_MAXIMO = 8L * 1024L * 1024L;

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final String apiKey;
    private final String model;

    public TranscricaoVozService(
        ObjectMapper objectMapper,
        @Value("${app.voz.openai-api-key:}") String apiKey,
        @Value("${app.voz.openai-model:gpt-4o-mini-transcribe}") String model
    ) {
        this.objectMapper = objectMapper;
        this.apiKey = apiKey;
        this.model = model;
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();
    }

    public String transcrever(MultipartFile audio) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("A transcrição por voz ainda não está configurada no servidor.");
        }
        if (audio == null || audio.isEmpty()) {
            throw new IllegalArgumentException("Grave um áudio antes de enviar.");
        }
        if (audio.getSize() > TAMANHO_MAXIMO) {
            throw new IllegalArgumentException("O áudio deve ter no máximo 8 MB.");
        }

        String boundary = "----SmartList" + UUID.randomUUID();
        try {
            byte[] corpo = montarMultipart(audio, boundary);
            HttpRequest request = HttpRequest.newBuilder(API_URI)
                .timeout(Duration.ofSeconds(75))
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                .POST(HttpRequest.BodyPublishers.ofByteArray(corpo))
                .build();
            HttpResponse<String> response = httpClient.send(
                request,
                HttpResponse.BodyHandlers.ofString()
            );
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new IllegalStateException(
                    "O serviço de voz recusou a transcrição (HTTP " + response.statusCode() + ")."
                );
            }
            JsonNode raiz = objectMapper.readTree(response.body());
            String texto = raiz.path("text").asText("").trim();
            if (texto.isBlank()) {
                throw new IllegalStateException("Não foi possível identificar produtos no áudio.");
            }
            return texto;
        } catch (InterruptedException erro) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("A transcrição foi interrompida.", erro);
        } catch (IOException erro) {
            throw new IllegalStateException("Não foi possível processar o áudio agora.", erro);
        }
    }

    private byte[] montarMultipart(MultipartFile audio, String boundary) throws IOException {
        ByteArrayOutputStream saida = new ByteArrayOutputStream();
        escrever(saida, "--" + boundary + "\r\n");
        escrever(saida, "Content-Disposition: form-data; name=\"model\"\r\n\r\n");
        escrever(saida, model + "\r\n");
        escrever(saida, "--" + boundary + "\r\n");
        escrever(saida, "Content-Disposition: form-data; name=\"language\"\r\n\r\n");
        escrever(saida, "pt\r\n");
        escrever(saida, "--" + boundary + "\r\n");
        escrever(saida, "Content-Disposition: form-data; name=\"file\"; filename=\"lista-rapida.m4a\"\r\n");
        escrever(saida, "Content-Type: " + tipoSeguro(audio.getContentType()) + "\r\n\r\n");
        saida.write(audio.getBytes());
        escrever(saida, "\r\n--" + boundary + "--\r\n");
        return saida.toByteArray();
    }

    private void escrever(ByteArrayOutputStream saida, String texto) throws IOException {
        saida.write(texto.getBytes(StandardCharsets.UTF_8));
    }

    private String tipoSeguro(String tipo) {
        return tipo != null && tipo.startsWith("audio/") ? tipo : "audio/mp4";
    }
}
