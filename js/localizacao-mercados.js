const OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter"
];
const RAIO_BUSCA_METROS = 25_000;

const ALIASES_REDES = new Map([
    ["Pão de Açúcar", ["pao de acucar", "pao acucar"]],
    ["Atacadão", ["atacadao"]],
    ["Recife Atacarejo", ["recife atacarejo", "atacarejo recife"]],
    ["Novo Atacarejo", ["novo atacarejo"]],
    ["Mix Mateus", ["mix mateus", "mix atacarejo", "mateus"]],
    ["Assaí Atacadista", ["assai", "assai atacadista"]],
    ["Arco-Mix", ["arco mix", "arcomix"]],
    ["Econômico Atacadão", ["economico atacadao"]],
    ["Atacado dos Presentes", ["atacado dos presentes"]],
    ["Makro", ["makro"]],
    ["Carrefour", ["carrefour"]],
    ["Extra Mercado", ["extra mercado", "extra supermercado"]],
    ["Rede Tem Supermercados", ["rede tem", "tem supermercados"]],
    ["Veneza Supermercados", ["veneza supermercados", "supermercado veneza"]],
    ["Bonanza Supermercados", ["bonanza supermercados", "supermercado bonanza"]],
    ["Supermercado da Família", ["supermercado da familia"]],
    ["KarneKeijo", ["karnekeijo", "karne queijo"]],
    ["Rende Mais Supermercados", ["rende mais", "rendemais"]],
    ["Recibom", ["recibom"]],
    ["Supermercados Melodia", ["supermercados melodia", "melodia supermercado"]],
    ["Fênix Supermercados", ["fenix supermercados", "supermercado fenix"]],
    ["Econômico Supermercados", ["economico supermercados", "supermercado economico"]],
    ["Boas Compras", ["boas compras"]],
    ["Mercadinho D. Helder", ["mercadinho d helder", "mercadinho dom helder"]],
    ["Trevo Supermercados", ["trevo supermercados", "supermercado trevo"]],
    ["Supermercado Pernambucano", ["supermercado pernambucano"]],
    ["MP Supermercado", ["mp supermercado"]],
    ["Supermercado Campeão", ["supermercado campeao"]],
    ["Supermercado La Roque", ["supermercado la roque", "la roque supermercado"]],
    ["J&A Supermercado", ["j a supermercado", "ja supermercado"]],
    ["Costa e Souza Supermercados", ["costa e souza supermercados", "costa souza supermercado"]],
    ["Lealdade Supermercados", ["lealdade supermercados", "supermercado lealdade"]],
    ["O Supermercado da Carne", ["o supermercado da carne", "supermercado da carne"]],
    ["Verde Frut", ["verde frut", "verdfrut"]],
    ["Deskontão", ["deskontao", "descontao"]],
    ["GBarbosa", ["gbarbosa", "g barbosa"]]
]);

export function normalizarTextoLocalizacao(valor) {
    return String(valor ?? "")
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

export function distanciaKm(origem, destino) {
    const radianos = graus => graus * Math.PI / 180;
    const latitude1 = radianos(Number(origem.latitude));
    const latitude2 = radianos(Number(destino.latitude));
    const deltaLatitude = radianos(Number(destino.latitude) - Number(origem.latitude));
    const deltaLongitude = radianos(Number(destino.longitude) - Number(origem.longitude));
    const a = Math.sin(deltaLatitude / 2) ** 2
        + Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(deltaLongitude / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatarEndereco(tags = {}) {
    if (tags["addr:full"]) return tags["addr:full"];
    const rua = [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(", ");
    const bairro = tags["addr:suburb"] || tags["addr:neighbourhood"] || tags["addr:district"];
    const cidade = tags["addr:city"] || tags["addr:municipality"];
    const estado = tags["addr:state"];
    const cep = tags["addr:postcode"];
    return [rua, bairro, [cidade, estado].filter(Boolean).join(" - "), cep ? `CEP ${cep}` : ""]
        .filter(Boolean)
        .join(" · ");
}

export function transformarElementosEmFiliais(elementos = [], posicao) {
    return elementos.flatMap(elemento => {
        const latitude = Number(elemento.lat ?? elemento.center?.lat);
        const longitude = Number(elemento.lon ?? elemento.center?.lon);
        const tags = elemento.tags || {};
        const nome = tags.name || tags.brand || tags.operator;
        if (!nome || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];
        const identificadores = [nome, tags.brand, tags.operator]
            .filter(Boolean)
            .map(normalizarTextoLocalizacao);
        const filial = {
            nome,
            identificadores,
            endereco: formatarEndereco(tags),
            cidade: tags["addr:city"] || tags["addr:municipality"] || "",
            estado: tags["addr:state"] || "",
            latitude,
            longitude,
            urlMapa: `https://www.openstreetmap.org/${elemento.type}/${elemento.id}`
        };
        return [{ ...filial, distanciaKm: posicao ? distanciaKm(posicao, filial) : null }];
    });
}

export function encontrarFilialMaisProxima(nomeMercado, filiais = []) {
    const nomeNormalizado = normalizarTextoLocalizacao(nomeMercado);
    const chave = Array.from(ALIASES_REDES.keys()).find(
        nome => normalizarTextoLocalizacao(nome) === nomeNormalizado
    );
    const aliases = ALIASES_REDES.get(chave) || [nomeNormalizado];
    return filiais
        .filter(filial => filial.identificadores.some(
            identificador => aliases.some(alias => identificador.includes(alias) || alias.includes(identificador))
        ))
        .sort((a, b) => (a.distanciaKm ?? Infinity) - (b.distanciaKm ?? Infinity))[0] || null;
}

export function cidadeMaisProvavel(filiais = []) {
    return filiais
        .filter(filial => filial.cidade)
        .sort((a, b) => (a.distanciaKm ?? Infinity) - (b.distanciaKm ?? Infinity))[0]?.cidade || "";
}

export function obterLocalizacaoUsuario() {
    return new Promise((resolve, reject) => {
        if (!globalThis.navigator?.geolocation) {
            reject(new Error("Localização não disponível neste dispositivo."));
            return;
        }
        navigator.geolocation.getCurrentPosition(
            posicao => resolve({
                latitude: posicao.coords.latitude,
                longitude: posicao.coords.longitude
            }),
            erro => {
                const mensagens = {
                    1: "Permissão de localização não concedida.",
                    2: "Não foi possível identificar sua localização.",
                    3: "A localização demorou demais para responder."
                };
                reject(new Error(mensagens[erro.code] || "Não foi possível obter sua localização."));
            },
            { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 }
        );
    });
}

export async function consultarFiliaisProximas(posicao, { fetchImpl = fetch } = {}) {
    const consulta = `[out:json][timeout:20];
(
  nwr["shop"~"^(supermarket|wholesale|convenience)$"](around:${RAIO_BUSCA_METROS},${posicao.latitude},${posicao.longitude});
);
out center tags;`;
    let ultimoErro;
    for (const endpoint of OVERPASS_ENDPOINTS) {
        const controlador = new AbortController();
        const temporizador = setTimeout(() => controlador.abort(), 22_000);
        try {
            const resposta = await fetchImpl(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
                body: new URLSearchParams({ data: consulta }),
                signal: controlador.signal
            });
            if (!resposta.ok) throw new Error(`Consulta de endereços indisponível (${resposta.status}).`);
            const dados = await resposta.json();
            return transformarElementosEmFiliais(dados.elements || [], posicao);
        } catch (erro) {
            ultimoErro = erro;
        } finally {
            clearTimeout(temporizador);
        }
    }
    throw ultimoErro || new Error("Não foi possível consultar as lojas próximas.");
}

