const { obterPlano } = require('../config/planos');
const SocioTorcedor = require('../models/SocioTorcedor');

const REGEX_ACENTOS = /[̀-ͯ]/g;

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

function obterPlanoDoSocio(plano) {
    return obterPlano(normalizarPlano(plano));
}

function obterDescontoIngresso(plano) {
    const info = obterPlanoDoSocio(plano);
    return info ? info.descontoIngresso : 0;
}

function aplicarDesconto(valor, desconto) {
    return Number((Number(valor) * (1 - desconto)).toFixed(2));
}

async function descontoDoUsuario(usuarioId) {
    if (!usuarioId) return 0;
    const socio = await SocioTorcedor.findOne({ where: { usuarioId, status: 'ativo' } });
    return socio ? obterDescontoIngresso(socio.plano) : 0;
}

module.exports = { normalizarPlano, obterPlanoDoSocio, obterDescontoIngresso, aplicarDesconto, descontoDoUsuario };
