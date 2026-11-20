function normalizarNumeroBR(valor) {
    const texto = String(valor ?? '').trim().replace(/^R\$/i, '').replace(/\s/g, '');
    if (texto.includes(',')) {
        return texto.replace(/\./g, '').replace(',', '.');
    }
    if (/^\d{1,3}(\.\d{3})+$/.test(texto)) {
        return texto.replace(/\./g, '');
    }
    return texto;
}

function lerValorMonetario(valor) {
    const texto = normalizarNumeroBR(valor);
    return /^\d+(\.\d{1,2})?$/.test(texto) ? Number(texto) : NaN;
}

function lerInteiro(valor) {
    const texto = normalizarNumeroBR(valor);
    return /^\d+$/.test(texto) ? Number(texto) : NaN;
}

function dataIsoValida(texto) {
    const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(texto || ''));
    if (!partes) return false;
    const [ano, mes, dia] = partes.slice(1).map(Number);
    const data = new Date(Date.UTC(ano, mes - 1, dia));
    return data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia;
}

function textoDaBusca(valor) {
    return String(Array.isArray(valor) ? valor[0] ?? '' : valor ?? '').trim();
}

module.exports = { lerValorMonetario, lerInteiro, dataIsoValida, textoDaBusca };
