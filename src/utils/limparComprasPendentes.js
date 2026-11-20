const { Op } = require('sequelize');
const IngressoCompra = require('../models/IngressoCompra');
const Pagamento = require('../models/Pagamento');
const { STATUS_AGUARDANDO_PAGAMENTO } = require('../config/statusPagamento');
const { PRAZO_COMPRA_PENDENTE_MS } = require('./estoqueIngresso');

const INTERVALO_LIMPEZA_MS = 10 * 60 * 1000;

async function limparComprasPendentes() {
    try {
        const where = {
            status: { [Op.in]: STATUS_AGUARDANDO_PAGAMENTO },
            createdAt: { [Op.lt]: new Date(Date.now() - PRAZO_COMPRA_PENDENTE_MS) }
        };
        const [[ingressos], [planos]] = await Promise.all([
            IngressoCompra.update({ status: 'expirado' }, { where }),
            Pagamento.update({ status: 'expirado' }, { where }),
        ]);
        if (ingressos + planos > 0) {
            console.log(`Limpeza: ${ingressos} compra(s) de ingresso e ${planos} pagamento(s) de plano sem pagamento marcados como expirados.`);
        }
    } catch (erro) {
        console.error('Erro ao expirar pagamentos pendentes:', erro);
    }
}

function agendarLimpezaComprasPendentes() {
    limparComprasPendentes();
    setInterval(limparComprasPendentes, INTERVALO_LIMPEZA_MS).unref();
}

module.exports = { limparComprasPendentes, agendarLimpezaComprasPendentes };
