const Ingresso = require('../models/Ingresso');
const IngressoCompra = require('../models/IngressoCompra');
const SocioTorcedor = require('../models/SocioTorcedor');
const Usuario = require('../models/Usuario');
const { obterDescontoIngresso } = require('../utils/socioDesconto');

async function listarIngressosPublico(req, res) {
    try {
        const ingressos = await Ingresso.findAll({
            where: { status: 'ativo' },
            order: [['dataPartida', 'ASC']]
        });

        let desconto = 0;
        if (req.usuario) {
            const socio = await SocioTorcedor.findOne({
                where: { usuarioId: req.usuario.id, status: 'ativo' }
            });
            if (socio) {
                desconto = obterDescontoIngresso(socio.plano);
            }
        }

        const lista = ingressos.map((i) => {
            const disponiveis = Math.max(i.quantidadeTotal - i.quantidadeVendida, 0);
            const percentVendido = i.quantidadeTotal > 0
                ? Math.min(Math.round((i.quantidadeVendida / i.quantidadeTotal) * 100), 100)
                : 0;

            return {
                id: i.id,
                partida: i.partida,
                competicao: i.competicao,
                dataPartida: i.dataPartida,
                local: i.local,
                valor: i.valor,
                valorComDesconto: Number((i.valor * (1 - desconto)).toFixed(2)),
                quantidadeTotal: i.quantidadeTotal,
                disponiveis,
                percentVendido,
                esgotado: disponiveis <= 0
            };
        });

        res.render('ingressos', { ingressos: lista, desconto });
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao carregar ingressos');
    }
}

function validarDados({ partida, dataPartida, local, valor, quantidadeTotal }) {
    if (!partida || !dataPartida || !local || !valor || quantidadeTotal === undefined || quantidadeTotal === '') {
        return 'Preencha partida, data, local, valor e quantidade de ingressos.';
    }
    if (Number(valor) <= 0) {
        return 'O valor do ingresso deve ser maior que zero.';
    }
    if (Number(quantidadeTotal) < 0) {
        return 'A quantidade não pode ser negativa.';
    }
    return null;
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
        res.render('admin/ingresso-vendas', { compras });
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
    const { partida, competicao, dataPartida, local, valor, quantidadeTotal } = req.body;

    const erro = validarDados(req.body);
    if (erro) {
        return res.render('admin/ingresso-form', { ingresso: null, dados: req.body, erro });
    }

    try {
        await Ingresso.create({
            partida,
            competicao: competicao || null,
            dataPartida,
            local,
            valor,
            quantidadeTotal,
            quantidadeVendida: 0,
            status: 'ativo'
        });
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
    const { id } = req.params;
    const { partida, competicao, dataPartida, local, valor, quantidadeTotal, status } = req.body;

    try {
        const ingresso = await Ingresso.findByPk(id);
        if (!ingresso) {
            return res.status(404).send('Ingresso não encontrado');
        }

        const erro = validarDados(req.body);
        if (erro) {
            return res.render('admin/ingresso-form', { ingresso, dados: req.body, erro });
        }

        if (Number(quantidadeTotal) < ingresso.quantidadeVendida) {
            return res.render('admin/ingresso-form', {
                ingresso,
                dados: req.body,
                erro: `A quantidade total não pode ser menor que os ${ingresso.quantidadeVendida} ingressos já vendidos.`
            });
        }

        await ingresso.update({
            partida,
            competicao: competicao || null,
            dataPartida,
            local,
            valor,
            quantidadeTotal,
            status: status || ingresso.status
        });

        res.redirect('/admin/ingressos');
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao atualizar ingresso');
    }
}

async function excluirIngresso(req, res) {
    try {
        const { id } = req.params;
        const ingresso = await Ingresso.findByPk(id);
        if (!ingresso) {
            return res.status(404).send('Ingresso não encontrado');
        }

        if (ingresso.quantidadeVendida > 0) {
            return res.status(400).send('Não é possível excluir um ingresso que já teve vendas. Encerre as vendas em vez de excluir.');
        }

        await ingresso.destroy();
        res.redirect('/admin/ingressos');
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao remover ingresso');
    }
}

module.exports = {
    listarIngressosPublico,
    listarVendasIngresso,
    listarIngressos,
    formNovoIngresso,
    criarIngresso,
    formEditarIngresso,
    atualizarIngresso,
    excluirIngresso
};
