package br.com.minhalista.oferta;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.minhalista.encarte.FonteEncarte;
import br.com.minhalista.encarte.FonteEncarteRepository;
import br.com.minhalista.encarte.StatusFonteEncarte;
import br.com.minhalista.encarte.TipoEncarte;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Service
public class DescobertaMercadosService {

    private static final String USER_AGENT =
        "SmartList/1.0 (descoberta de mercados solicitada pelo usuario)";
    private static final Duration CACHE_LOCALIDADE = Duration.ofDays(30);
    private static final Duration CACHE_MERCADOS = Duration.ofHours(24);
    private static final Object LIMITE_NOMINATIM = new Object();
    private static long ultimaConsultaNominatim;

    private final UnidadeMercadoRepository unidadeRepository;
    private final FonteEncarteRepository fonteRepository;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final URI nominatim;
    private final URI overpass;
    private final Map<String, Cache<LocalidadePublica>> localidades = new ConcurrentHashMap<>();
    private final Map<String, Instant> descobertas = new ConcurrentHashMap<>();
    private final List<String> fontesPublicas;

    public DescobertaMercadosService(
        UnidadeMercadoRepository unidadeRepository,
        FonteEncarteRepository fonteRepository,
        ObjectMapper objectMapper,
        @Value("${app.ofertas.nominatim-url:https://nominatim.openstreetmap.org/reverse}") String nominatim,
        @Value("${app.ofertas.overpass-url:https://overpass-api.de/api/interpreter}") String overpass
    ) {
        this.unidadeRepository = unidadeRepository;
        this.fonteRepository = fonteRepository;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(12))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();
        this.nominatim = URI.create(nominatim);
        this.overpass = URI.create(overpass);
        this.fontesPublicas = carregarFontes();
    }

    public LocalidadePublica localizar(double latitude, double longitude) {
        String chave = celula(latitude, longitude);
        Cache<LocalidadePublica> cache = localidades.get(chave);
        if (cache != null && cache.valido()) {
            return cache.valor();
        }
        try {
            limitarNominatim();
            String separador = nominatim.toString().contains("?") ? "&" : "?";
            URI uri = URI.create(nominatim + separador
                + "format=jsonv2&addressdetails=1&zoom=14&lat=" + arredondar(latitude)
                + "&lon=" + arredondar(longitude));
            JsonNode raiz = enviar(HttpRequest.newBuilder(uri)
                .timeout(Duration.ofSeconds(15))
                .header("User-Agent", USER_AGENT)
                .header("Accept", "application/json")
                .header("Accept-Language", "pt-BR")
                .GET()
                .build());
            JsonNode endereco = raiz.path("address");
            String cidade = primeiro(
                texto(endereco, "city"), texto(endereco, "town"),
                texto(endereco, "village"), texto(endereco, "municipality")
            );
            String bairro = primeiro(
                texto(endereco, "suburb"), texto(endereco, "neighbourhood"),
                texto(endereco, "city_district")
            );
            String estado = uf(
                primeiro(texto(endereco, "ISO3166-2-lvl4"), texto(endereco, "state"))
            );
            LocalidadePublica resultado = new LocalidadePublica(cidade, estado, bairro);
            if (cidade != null && estado != null) {
                localidades.put(chave, new Cache<>(
                    resultado, Instant.now().plus(CACHE_LOCALIDADE)
                ));
            }
            return resultado;
        } catch (RuntimeException erro) {
            return new LocalidadePublica(null, null, null);
        }
    }

    @Transactional
    public void descobrir(double latitude, double longitude, double raioKm) {
        double raioSeguro = Math.max(1, Math.min(25, raioKm));
        String chave = celula(latitude, longitude) + ":" + Math.round(raioSeguro);
        Instant executada = descobertas.get(chave);
        if (executada != null && executada.plus(CACHE_MERCADOS).isAfter(Instant.now())) {
            return;
        }
        LocalidadePublica localidade = localizar(latitude, longitude);
        try {
            int raioMetros = (int) Math.round(raioSeguro * 1000);
            String consulta = "[out:json][timeout:15];("
                + "nwr(around:" + raioMetros + "," + arredondar(latitude) + ","
                + arredondar(longitude)
                + ")[\"shop\"~\"^(supermarket|wholesale)$\"];);out center tags 100;";
            String corpo = "data=" + URLEncoder.encode(consulta, StandardCharsets.UTF_8);
            JsonNode raiz = enviar(HttpRequest.newBuilder(overpass)
                .timeout(Duration.ofSeconds(25))
                .header("User-Agent", USER_AGENT)
                .header("Accept", "application/json")
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(corpo))
                .build());
            for (JsonNode elemento : raiz.path("elements")) {
                salvarElemento(elemento, localidade);
            }
            descobertas.put(chave, Instant.now());
        } catch (RuntimeException erro) {
            // A busca local continua funcionando com as unidades ja cadastradas.
        }
    }

    private void salvarElemento(JsonNode elemento, LocalidadePublica localidade) {
        JsonNode tags = elemento.path("tags");
        String nome = primeiro(texto(tags, "name"), texto(tags, "brand"), texto(tags, "operator"));
        if (nome == null) {
            return;
        }
        double latitude = elemento.path("lat").asDouble(
            elemento.path("center").path("lat").asDouble(Double.NaN)
        );
        double longitude = elemento.path("lon").asDouble(
            elemento.path("center").path("lon").asDouble(Double.NaN)
        );
        if (!Double.isFinite(latitude) || !Double.isFinite(longitude)) {
            return;
        }
        String chave = "osm:" + elemento.path("type").asText("objeto") + ":"
            + elemento.path("id").asText();
        UnidadeMercado unidade = unidadeRepository.findByChaveExterna(chave)
            .orElseGet(UnidadeMercado::new);
        String rede = primeiro(texto(tags, "brand"), texto(tags, "operator"), nome);
        unidade.setChaveExterna(chave);
        unidade.setRede(limitar(rede, 120));
        unidade.setNome(limitar(nome, 140));
        unidade.setEndereco(limitar(endereco(tags), 240));
        unidade.setBairro(limitar(primeiro(
            texto(tags, "addr:suburb"), texto(tags, "addr:district"), localidade.bairro()
        ), 100));
        unidade.setCidade(limitar(primeiro(
            texto(tags, "addr:city"), localidade.cidade(), "Localidade não informada"
        ), 100));
        unidade.setEstado(limitar(primeiro(
            uf(texto(tags, "addr:state")), localidade.estado(), "BR"
        ), 2));
        unidade.setLatitude(latitude);
        unidade.setLongitude(longitude);
        unidade.setAtiva(true);
        unidade = unidadeRepository.save(unidade);
        associarFonte(unidade, rede);
    }

    private void associarFonte(UnidadeMercado unidade, String rede) {
        String redeNormalizada = normalizar(rede);
        Optional<String> url = fontesPublicas.stream()
            .filter(fonte -> corresponde(redeNormalizada, fonte))
            .findFirst();
        if (url.isEmpty()) {
            return;
        }
        String chave = java.util.UUID.nameUUIDFromBytes(
            (unidade.getChaveExterna() + "|" + url.get()).getBytes(StandardCharsets.UTF_8)
        ).toString();
        if (fonteRepository.findByChaveFonte(chave).isPresent()) {
            return;
        }
        FonteEncarte fonte = new FonteEncarte();
        fonte.setUnidade(unidade);
        fonte.setChaveFonte(chave);
        fonte.setNome("Fonte pública - " + limitar(rede, 120));
        fonte.setUrl(url.get());
        fonte.setTipo(TipoEncarte.AUTOMATICO);
        fonte.setStatus(StatusFonteEncarte.AGUARDANDO);
        fonte.setAtiva(true);
        fonteRepository.save(fonte);
    }

    private boolean corresponde(String rede, String url) {
        try {
            String host = URI.create(url).getHost();
            if (host == null) return false;
            for (String parte : host.toLowerCase(Locale.ROOT).split("\\.")) {
                String token = normalizar(parte);
                if (token.length() >= 4
                    && !List.of("mercado", "supermercado", "supermercados", "atacado",
                        "delivery", "online", "compras", "com", "www").contains(token)
                    && (rede.contains(token) || token.contains(rede))) {
                    return true;
                }
            }
        } catch (IllegalArgumentException _erro) {
            return false;
        }
        return false;
    }

    private List<String> carregarFontes() {
        try (var linhas = new java.io.BufferedReader(new java.io.InputStreamReader(
            new ClassPathResource("fontes-publicas-mercados.txt").getInputStream(),
            StandardCharsets.UTF_8
        ))) {
            return linhas.lines()
                .map(String::trim)
                .filter(linha -> linha.startsWith("https://"))
                .distinct()
                .toList();
        } catch (IOException erro) {
            return List.of();
        }
    }

    private JsonNode enviar(HttpRequest request) {
        try {
            HttpResponse<String> resposta = httpClient.send(
                request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)
            );
            if (resposta.statusCode() < 200 || resposta.statusCode() >= 300) {
                throw new IllegalStateException("Serviço público temporariamente indisponível.");
            }
            return objectMapper.readTree(resposta.body());
        } catch (InterruptedException erro) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Consulta interrompida.", erro);
        } catch (IOException erro) {
            throw new IllegalStateException("Falha ao consultar dados públicos.", erro);
        }
    }

    private static void limitarNominatim() {
        synchronized (LIMITE_NOMINATIM) {
            long espera = 1000 - (System.currentTimeMillis() - ultimaConsultaNominatim);
            if (espera > 0) {
                try {
                    LIMITE_NOMINATIM.wait(espera);
                } catch (InterruptedException erro) {
                    Thread.currentThread().interrupt();
                }
            }
            ultimaConsultaNominatim = System.currentTimeMillis();
        }
    }

    private String endereco(JsonNode tags) {
        String rua = primeiro(texto(tags, "addr:street"), texto(tags, "addr:place"));
        String numero = texto(tags, "addr:housenumber");
        return rua == null ? null : numero == null ? rua : rua + ", " + numero;
    }

    private String texto(JsonNode no, String campo) {
        String valor = no.path(campo).asText("").trim();
        return valor.isBlank() ? null : valor;
    }

    private String primeiro(String... valores) {
        for (String valor : valores) {
            if (valor != null && !valor.isBlank()) return valor.trim();
        }
        return null;
    }

    private String uf(String valor) {
        if (valor == null || valor.isBlank()) return null;
        String limpa = valor.trim();
        if (limpa.matches("(?i)BR-[A-Z]{2}")) return limpa.substring(3).toUpperCase(Locale.ROOT);
        if (limpa.matches("(?i)[A-Z]{2}")) return limpa.toUpperCase(Locale.ROOT);
        return switch (normalizar(limpa)) {
            case "acre" -> "AC"; case "alagoas" -> "AL"; case "amapa" -> "AP";
            case "amazonas" -> "AM"; case "bahia" -> "BA"; case "ceara" -> "CE";
            case "distritofederal" -> "DF"; case "espiritosanto" -> "ES";
            case "goias" -> "GO"; case "maranhao" -> "MA"; case "matogrosso" -> "MT";
            case "matogrossodosul" -> "MS"; case "minasgerais" -> "MG";
            case "para" -> "PA"; case "paraiba" -> "PB"; case "parana" -> "PR";
            case "pernambuco" -> "PE"; case "piaui" -> "PI"; case "riodejaneiro" -> "RJ";
            case "riograndedonorte" -> "RN"; case "riograndedosul" -> "RS";
            case "rondonia" -> "RO"; case "roraima" -> "RR"; case "santacatarina" -> "SC";
            case "saopaulo" -> "SP"; case "sergipe" -> "SE"; case "tocantins" -> "TO";
            default -> null;
        };
    }

    private String normalizar(String valor) {
        return java.text.Normalizer.normalize(
            valor == null ? "" : valor, java.text.Normalizer.Form.NFD
        ).replaceAll("\\p{M}", "").replaceAll("[^a-zA-Z0-9]", "")
            .toLowerCase(Locale.ROOT);
    }

    private String celula(double latitude, double longitude) {
        return arredondar(latitude) + ":" + arredondar(longitude);
    }

    private double arredondar(double valor) {
        return Math.round(valor * 100.0) / 100.0;
    }

    private String limitar(String valor, int limite) {
        return valor == null ? null : valor.substring(0, Math.min(valor.length(), limite));
    }

    public record LocalidadePublica(String cidade, String estado, String bairro) {}
    private record Cache<T>(T valor, Instant expiraEm) {
        boolean valido() { return expiraEm.isAfter(Instant.now()); }
    }
}
