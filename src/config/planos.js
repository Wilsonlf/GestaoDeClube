const PLANOS = {
    ninho: {
        chave: 'ninho',
        nome: 'Ninho',
        titulo: 'Sócio Torcedor - Ninho',
        valor: 19.9,
        descontoIngresso: 0.10,
        cor: '#a01421',
    },
    asas_negras: {
        chave: 'asas_negras',
        nome: 'Asas Negras',
        titulo: 'Sócio Torcedor - Asas Negras',
        valor: 39.9,
        descontoIngresso: 0.20,
        cor: '#c9a24a',
    },
    voo_supremo: {
        chave: 'voo_supremo',
        nome: 'Voo Supremo',
        titulo: 'Sócio Torcedor - Voo Supremo',
        valor: 79.9,
        descontoIngresso: 0.30,
        cor: '#7d7b76',
    },
};

function obterPlano(chave) {
    return typeof chave === 'string' && Object.hasOwn(PLANOS, chave) ? PLANOS[chave] : null;
}

function listarPlanos() {
    return Object.values(PLANOS);
}

module.exports = { PLANOS, obterPlano, listarPlanos };
