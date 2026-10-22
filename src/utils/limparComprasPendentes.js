const { Op } = require('sequelize');
const IngressoCompra = require('../models/IngressoCompra');

const PRAZO_COMPRA_PENDENTE_MS = 24 * 60 * 60 * 1000;
const INTERVALO_LIMPEZA_MS = 60 * 60 * 1000;

const STATUS_PENDENTES = ['pendente', 'pending'];

async function limparComprasPendentes() {
    try {
        const limite = new Date(Date.now() - PRAZO_COMPRA_PENDENTE_MS);
        const removidas = await IngressoCompra.destroy({
            where: {
                status: { [Op.in]: STATUS_PENDENTES },
                createdAt: { [Op.lt]: limite }
            }
        });
        if (removidas > 0) {
            console.log(`Limpeza: ${removidas} compra(s) de ingresso pendente(s) há mais de 1 dia removida(s).`);
        }
    } catch (erro) {
        console.error('Erro ao limpar compras pendentes:', erro);
    }
}

function agendarLimpezaComprasPendentes() {
    limparComprasPendentes();
    setInterval(limparComprasPendentes, INTERVALO_LIMPEZA_MS);
}

module.exports = { PRAZO_COMPRA_PENDENTE_MS, limparComprasPendentes, agendarLimpezaComprasPendentes };
