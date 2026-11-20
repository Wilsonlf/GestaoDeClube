const { Op, fn, col } = require('sequelize');
const IngressoCompra = require('../models/IngressoCompra');
const { STATUS_AGUARDANDO_PAGAMENTO, STATUS_EM_ANALISE } = require('../config/statusPagamento');

const PRAZO_COMPRA_PENDENTE_MS = 30 * 60 * 1000;
const PRAZO_EM_ANALISE_MS = 3 * 24 * 60 * 60 * 1000;
const MAX_INGRESSOS_POR_COMPRA = 10;
const MAX_RESERVAS_POR_USUARIO = 2;

function filtroReservasAtivas() {
    const agora = Date.now();
    return {
        [Op.or]: [
            { status: STATUS_EM_ANALISE, createdAt: { [Op.gt]: new Date(agora - PRAZO_EM_ANALISE_MS) } },
            { status: { [Op.in]: STATUS_AGUARDANDO_PAGAMENTO }, createdAt: { [Op.gt]: new Date(agora - PRAZO_COMPRA_PENDENTE_MS) } },
        ],
    };
}

async function quantidadeReservada(ingressoId, transaction) {
    const total = await IngressoCompra.sum('quantidade', {
        where: { ingressoId, ...filtroReservasAtivas() },
        transaction,
    });
    return Number(total) || 0;
}

async function reservasAtivasDoUsuario(usuarioId, transaction) {
    return IngressoCompra.count({
        where: { usuarioId, ...filtroReservasAtivas() },
        transaction,
    });
}

async function reservasPorIngresso() {
    const linhas = await IngressoCompra.findAll({
        attributes: ['ingressoId', [fn('SUM', col('quantidade')), 'total']],
        where: filtroReservasAtivas(),
        group: ['ingressoId'],
        raw: true,
    });
    const mapa = {};
    linhas.forEach((l) => { mapa[l.ingressoId] = Number(l.total) || 0; });
    return mapa;
}

function calcularDisponiveis(ingresso, reservados) {
    return Math.max(ingresso.quantidadeTotal - ingresso.quantidadeVendida - (reservados || 0), 0);
}

module.exports = {
    PRAZO_COMPRA_PENDENTE_MS,
    MAX_INGRESSOS_POR_COMPRA,
    MAX_RESERVAS_POR_USUARIO,
    filtroReservasAtivas,
    quantidadeReservada,
    reservasAtivasDoUsuario,
    reservasPorIngresso,
    calcularDisponiveis,
};
