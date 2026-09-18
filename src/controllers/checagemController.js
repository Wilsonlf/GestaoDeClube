const IngressoCompra = require('../models/IngressoCompra');
const Ingresso = require('../models/Ingresso');
const Usuario = require('../models/Usuario');

function formChecagem(req, res) {
    res.render('admin/checagem');
}


function serializarCompra(compra) {
    return {
        id: compra.id,
        quantidade: compra.quantidade,
        statusPagamento: compra.status,
        statusCheckin: compra.statusCheckin,
        dataCheckin: compra.dataCheckin,
        comprador: {
            nome: compra.Usuario?.nome || '',
            cpf: compra.Usuario?.cpf || '',
        },
        partida: {
            nome: compra.Ingresso?.partida || '',
            local: compra.Ingresso?.local || '',
            dataPartida: compra.Ingresso?.dataPartida || null,
        },
    };
}

async function validarCompra(compra, req, res) {
    if (compra.status !== 'aprovado') {
        return res.status(400).json({ erro: 'Pagamento deste ingresso ainda não foi aprovado.', ingresso: serializarCompra(compra) });
    }

    if (compra.statusCheckin === 'utilizado') {
        return res.status(409).json({ erro: 'Este ingresso já foi utilizado.', ingresso: serializarCompra(compra) });
    }

    compra.statusCheckin = 'utilizado';
    compra.dataCheckin = new Date();
    compra.validadoPor = req.usuario.id;
    await compra.save();

    return res.json({ sucesso: true, ingresso: serializarCompra(compra) });
}

async function validarPorHash(req, res) {
    try {
        const { hash } = req.body;
        if (!hash) {
            return res.status(400).json({ erro: 'QR Code vazio.' });
        }

        const compra = await IngressoCompra.findOne({
            where: { hashQr: hash },
            include: [Usuario, Ingresso],
        });

        if (!compra) {
            return res.status(404).json({ erro: 'QR Code não corresponde a nenhum ingresso.' });
        }

        return await validarCompra(compra, req, res);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao validar o ingresso.' });
    }
}


async function buscarPorCpf(req, res) {
    try {
        const cpf = (req.body.cpf || '').replace(/\D/g, '');
        if (!cpf) {
            return res.status(400).json({ erro: 'Informe o CPF.' });
        }

        const usuario = await Usuario.findOne({ where: { cpf } });
        if (!usuario) {
            return res.status(404).json({ erro: 'Nenhum usuário encontrado com esse CPF.' });
        }

        const compras = await IngressoCompra.findAll({
            where: { usuarioId: usuario.id, status: 'aprovado' },
            include: [Usuario, Ingresso],
            order: [['createdAt', 'DESC']],
        });

        if (compras.length === 0) {
            return res.status(404).json({ erro: 'Este CPF não tem ingressos pagos.' });
        }

        res.json({ ingressos: compras.map(serializarCompra) });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao buscar ingresso pelo CPF.' });
    }
}

async function validarManual(req, res) {
    try {
        const { compraId } = req.body;
        const compra = await IngressoCompra.findByPk(compraId, { include: [Usuario, Ingresso] });

        if (!compra) {
            return res.status(404).json({ erro: 'Compra não encontrada.' });
        }

        return await validarCompra(compra, req, res);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao validar o ingresso.' });
    }
}

module.exports = { formChecagem, validarPorHash, buscarPorCpf, validarManual };
