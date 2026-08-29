export function somenteDigitosCpf(valor) {
    return String(valor || "").replace(/\D/g, "").slice(0, 11);
}

export function formatarCpf(valor) {
    const digitos = somenteDigitosCpf(valor);

    return digitos
        .replace(/^(\d{3})(\d)/, "$1.$2")
        .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

export function cpfValido(valor) {
    const cpf = somenteDigitosCpf(valor);

    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
        return false;
    }

    const calcularDigito = quantidade => {
        let soma = 0;

        for (let indice = 0; indice < quantidade; indice += 1) {
            soma += Number(cpf[indice]) * (quantidade + 1 - indice);
        }

        const resto = (soma * 10) % 11;
        return resto === 10 ? 0 : resto;
    };

    return calcularDigito(9) === Number(cpf[9])
        && calcularDigito(10) === Number(cpf[10]);
}
