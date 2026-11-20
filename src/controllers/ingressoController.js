const { Op } = require('sequelize');
const QRCode = require('qrcode');
const Ingresso = require('../models/Ingresso');
const IngressoCompra = require('../models/IngressoCompra');
const Usuario = require('../models/Usuario');
const { aplicarDesconto, descontoDoUsuario } = require('../utils/socioDesconto');
const { quantidadeReservada, reservasPorIngresso, calcularDisponiveis } = require('../utils/estoqueIngresso');
const { lerValorMonetario, lerInteiro, dataIsoValida } = require('../utils/entrada');
const { rotuloStatus, STATUS_PENDENTES } = require('../config/statusPagamento');

const STATUS_INGRESSO = ['ativo', 'encerrado'];

async function listarIngressosPublico(req, res) {
    try {
        const ingressos = await Ingresso.findAll({
            where: { status: 'ativo' },
            order: [['dataPartida', 'ASC']]
        });

        const desconto = await descontoDoUsuario(req.usuario?.id);
        const reservas = await reservasPorIngresso();

        const agora = new Date();
        const lista = ingressos.map((i) => {
            const disponiveis = calcularDisponiveis(i, reservas[i.id]);
            const percentVendido = i.quantidadeTotal > 0
                ? Math.min(Math.round(((i.quantidadeTotal - disponiveis) / i.quantidadeTotal) * 100), 100)
                : 0;

            return {
                id: i.id,
                partida: i.partida,
                competicao: i.competicao,
                dataPartida: i.dataPartida,
                local: i.local,
                valor: i.valor,
                valorComDesconto: aplicarDesconto(i.valor, desconto),
                quantidadeTotal: i.quantidadeTotal,
                disponiveis,
                percentVendido,
                esgotado: disponiveis <= 0,
                vendasEncerradas: new Date(i.dataPartida) < agora
            };
        });

        res.render('ingressos', { ingressos: lista, desconto });
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao carregar ingressos');
    }
}

function validarIngresso(corpo) {
    const partida = String(corpo.partida || '').trim();
    const local = String(corpo.local || '').trim();
    const competicao = String(corpo.competicao || '').trim();
    const valor = lerValorMonetario(corpo.valor);
    const quantidadeTotal = lerInteiro(corpo.quantidadeTotal);
    const dataPartida = new Date(corpo.dataPartida);

    if (!partida || !local || !corpo.dataPartida) {
        return { erro: 'Preencha partida, data, local, valor e quantidade de ingressos.' };
    }
    if (Number.isNaN(dataPartida.getTime()) || !dataIsoValida(corpo.dataPartida)) {
        return { erro: 'Data da partida inválida.' };
    }
    if (!Number.isFinite(valor) || valor <= 0) {
        return { erro: 'O valor do ingresso deve ser um número maior que zero (ex.: 25,00).' };
    }
    if (!Number.isInteger(quantidadeTotal) || quantidadeTotal < 0) {
        return { erro: 'A quantidade de ingressos deve ser um número inteiro, zero ou maior.' };
    }
    if (corpo.status !== undefined && !STATUS_INGRESSO.includes(corpo.status)) {
        return { erro: 'Status inválido.' };
    }

    return {
        dados: {
            partida,
            local,
            competicao: competicao || null,
            dataPartida,
            valor: Number(valor.toFixed(2)),
            quantidadeTotal,
        },
    };
}


async function listarVendasIngresso(req, res) {
    try {
        const compras = await IngressoCompra.findAll({
            include: [
                { model: Usuario, attributes: ['nome', 'cpf'] },
                { model: Ingresso, attributes: ['partida', 'dataPartida'] },
            ],
            order: [['createdAt', 'DESC']],
        });
        res.render('admin/ingresso-vendas', { compras, rotuloStatus });
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao carregar vendas de ingressos');
    }
}

async function listarIngressos(req, res) {
    try {
        const ingressos = await Ingresso.findAll({ order: [['dataPartida', 'ASC']] });
        res.render('admin/ingressos', { ingressos });
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao carregar ingressos');
    }
}

function formNovoIngresso(req, res) {
    res.render('admin/ingresso-form', { ingresso: null, dados: {}, erro: null });
}

async function criarIngresso(req, res) {
    const { erro, dados } = validarIngresso(req.body);
    if (erro) {
        return res.render('admin/ingresso-form', { ingresso: null, dados: req.body, erro });
    }

    try {
        await Ingresso.create({ ...dados, quantidadeVendida: 0, status: 'ativo' });
        res.redirect('/admin/ingressos');
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao cadastrar ingresso');
    }
}

async function formEditarIngresso(req, res) {
    try {
        const ingresso = await Ingresso.findByPk(req.params.id);
        if (!ingresso) {
            return res.status(404).send('Ingresso não encontrado');
        }
        res.render('admin/ingresso-form', { ingresso, dados: null, erro: null });
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao carregar ingresso');
    }
}

async function atualizarIngresso(req, res) {
    try {
        const ingresso = await Ingresso.findByPk(req.params.id);
        if (!ingresso) {
            return res.status(404).send('Ingresso não encontrado');
        }

        const { erro, dados } = validarIngresso(req.body);
        if (erro) {
            return res.render('admin/ingresso-form', { ingresso, dados: req.body, erro });
        }

        const reservados = await quantidadeReservada(ingresso.id);
        const minimo = ingresso.quantidadeVendida + reservados;
        if (dados.quantidadeTotal < minimo) {
            return res.render('admin/ingresso-form', {
                ingresso,
                dados: req.body,
                erro: `A quantidade total não pode ser menor que ${minimo} (${ingresso.quantidadeVendida} vendidos e ${reservados} em pagamento).`
            });
        }

        await ingresso.update({ ...dados, status: req.body.status || ingresso.status });
        res.redirect('/admin/ingressos');
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao atualizar ingresso');
    }
}

async function excluirIngresso(req, res) {
    try {
        const ingresso = await Ingresso.findByPk(req.params.id);
        if (!ingresso) {
            return res.status(404).send('Ingresso não encontrado');
        }

        const compras = await IngressoCompra.count({ where: { ingressoId: ingresso.id } });
        if (ingresso.quantidadeVendida > 0 || compras > 0) {
            return res.status(400).send('Não é possível excluir uma partida que já recebeu pedidos de compra, para não apagar o histórico financeiro. Encerre as vendas em vez de excluir.');
        }

        await ingresso.destroy();
        res.redirect('/admin/ingressos');
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao remover ingresso');
    }
}

const ENTRADA_ATE_MS_APOS_INICIO = 6 * 60 * 60 * 1000;
const STATUS_VISIVEIS_AO_COMPRADOR = ['aprovado', ...STATUS_PENDENTES];

async function listarMeusIngressos(req, res) {
    try {
        res.set('Cache-Control', 'no-store');
        const compras = await IngressoCompra.findAll({
            where: { usuarioId: req.usuario.id, status: { [Op.in]: STATUS_VISIVEIS_AO_COMPRADOR } },
            include: [{ model: Ingresso, attributes: ['partida', 'competicao', 'dataPartida', 'local'] }],
        });

        const agora = Date.now();
        const lista = await Promise.all(compras.filter((c) => c.Ingresso).map(async (c) => {
            const dataPartida = new Date(c.Ingresso.dataPartida);
            const encerrada = dataPartida.getTime() + ENTRADA_ATE_MS_APOS_INICIO < agora;
            const pago = c.status === 'aprovado' && Boolean(c.hashQr);
            const utilizado = c.statusCheckin === 'utilizado';
            return {
                id: c.id,
                partida: c.Ingresso.partida,
                competicao: c.Ingresso.competicao,
                local: c.Ingresso.local,
                dataPartida,
                quantidade: c.quantidade,
                pago,
                utilizado,
                encerrada,
                rotuloStatus: rotuloStatus(c.status),
                qr: pago && !utilizado && !encerrada
                    ? await QRCode.toDataURL(c.hashQr, { width: 260, margin: 1 })
                    : null,
            };
        }));

        const proximos = lista.filter((i) => !i.encerrada).sort((a, b) => a.dataPartida - b.dataPartida);
        const anteriores = lista.filter((i) => i.encerrada && i.pago).sort((a, b) => b.dataPartida - a.dataPartida);

        res.render('meus-ingressos', { proximos, anteriores });
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao carregar seus ingressos');
    }
}

module.exports = {
    listarIngressosPublico,
    listarMeusIngressos,
    listarVendasIngresso,
    listarIngressos,
    formNovoIngresso,
    criarIngresso,
    formEditarIngresso,
    atualizarIngresso,
    excluirIngresso
};
