// Percentual de desconto em ingressos por plano de Socio Torcedor.
// Os valores batem com o que e anunciado em src/views/planos.ejs.
const DESCONTOS_POR_PLANO = {
    ninho: 0.10,
    asas_negras: 0.20,
    voo_supremo: 0.30,
};

const REGEX_ACENTOS = new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g');

// O campo SocioTorcedor.plano e gravado de duas formas diferentes hoje:
// checkout publico grava 'ninho' | 'asas_negras' | 'voo_supremo' (vem do data-plano),
// cadastro manual no admin grava 'Ninho' | 'Asas Negras' | 'Voo Supremo' (vem do <select>).
// Normaliza os dois formatos para a mesma chave antes de consultar o desconto.
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
