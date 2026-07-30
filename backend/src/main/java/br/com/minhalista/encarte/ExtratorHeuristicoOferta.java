package br.com.minhalista.encarte;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.stereotype.Component;

@Component
public class ExtratorHeuristicoOferta {

    private static final Pattern PRECO = Pattern.compile(
        "(?:R\\$\\s*)?(\\d{1,4}[,.]\\d{2})(?!\\d)"
    );
    private static final Pattern VALIDADE = Pattern.compile(
        "(?i)(?:valid[oa]|até|de)\\D{0,20}(\\d{2}/\\d{2}/\\d{4})"
    );
    private static final Pattern PESO = Pattern.compile(
        "(?i)\\b(\\d+(?:[,.]\\d+)?)\\s*(kg|g|l|ml|un(?:idade)?)\\b"
    );

    public List<OfertaExtraida> extrair(String texto) {
        String[] linhas = texto.replace('\r', '\n').split("\\n+");
        LocalDate validade = extrairValidade(texto);
        List<OfertaExtraida> ofertas = new ArrayList<>();

        for (int indice = 0; indice < linhas.length; indice++) {
            String linha = limpar(linhas[indice]);
            Matcher preco = PRECO.matcher(linha);
            if (!preco.find()) {
                continue;
            }

            String produto = linha.substring(0, preco.start()).trim();
            if (produto.length() < 3 && indice > 0) {
                produto = limpar(linhas[indice - 1]);
            }
            produto = produto.replaceAll("(?i)\\b(?:por|apenas|oferta)\\s*$", "").trim();
            if (!produtoValido(produto)) {
                continue;
            }

            BigDecimal valor = decimal(preco.group(1));
            Matcher peso = PESO.matcher(produto);
            BigDecimal quantidade = null;
            String unidade = null;
            String pesoVolume = null;
            if (peso.find()) {
                quantidade = decimal(peso.group(1));
                unidade = peso.group(2).toLowerCase();
                pesoVolume = peso.group(0);
            }
            ofertas.add(new OfertaExtraida(
                produto,
                null,
                null,
                pesoVolume,
                quantidade,
                unidade,
                valor,
                null,
                null,
                null,
                validade,
                new BigDecimal("0.5500")
            ));
        }
        return ofertas.stream().limit(150).toList();
    }

    private LocalDate extrairValidade(String texto) {
        Matcher matcher = VALIDADE.matcher(texto);
        if (!matcher.find()) {
            return null;
        }
        try {
            return LocalDate.parse(matcher.group(1), DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        } catch (DateTimeParseException erro) {
            return null;
        }
    }

    private boolean produtoValido(String produto) {
        return produto.length() >= 3
            && produto.length() <= 200
            && produto.chars().anyMatch(Character::isLetter)
            && !produto.matches("(?i).*(total|economia|telefone|whatsapp|cnpj|cpf).*");
    }

    private BigDecimal decimal(String valor) {
        return new BigDecimal(valor.replace(".", "").replace(',', '.'));
    }

    private String limpar(String valor) {
        return valor == null ? "" : valor.replaceAll("\\s+", " ").trim();
    }
}
