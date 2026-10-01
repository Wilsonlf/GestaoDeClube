const DESCONTOS_POR_PLANO = {
    ninho: 0.10,
    asas_negras: 0.20,
    voo_supremo: 0.30,
};

const REGEX_ACENTOS = new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g');

function normalizarPlano(plano) {
    if (!plano) return '';
    return plano
        .toString()
        .normalize('NFD')
        .replace(REGEX_ACENTOS, '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_');
}

function obterDescontoIngresso(plano) {
    return DESCONTOS_POR_PLANO[normalizarPlano(plano)] || 0;
}

module.exports = { normalizarPlano, obterDescontoIngresso };
