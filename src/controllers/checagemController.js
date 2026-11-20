const IngressoCompra = require('../models/IngressoCompra');
const Ingresso = require('../models/Ingresso');
const Usuario = require('../models/Usuario');
const { somenteDigitos } = require('../utils/validacaoCadastro');

const JANELA_ANTES_DA_PARTIDA_MS = 12 * 60 * 60 * 1000;
const JANELA_DEPOIS_DA_PARTIDA_MS = 6 * 60 * 60 * 1000;

function formChecagem(req, res) {
    res.render('admin/checagem');
}

function partidaEmAndamento(ingresso, agora = new Date()) {
    if (!ingresso || !ingresso.dataPartida) return false;
    const inicio = new Date(ingresso.dataPartida).getTime();
    return agora.getTime() >= inicio - JANELA_ANTES_DA_PARTIDA_MS
        && agora.getTime() <= inicio + JANELA_DEPOIS_DA_PARTIDA_MS;
}

function serializarCompra(compra) {
    return {
        id: compra.id,
        quantidade: compra.quantidade,
        statusPagamento: compra.status,
        statusCheckin: compra.statusCheckin,
        dataCheckin: compra.dataCheckin,
        entradaLiberadaAgora: partidaEmAndamento(compra.Ingresso),
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
        return res.status(400).json({ erro: 'Pagamento deste ingresso não está aprovado.', ingresso: serializarCompra(compra) });
    }

    if (compra.statusCheckin === 'utilizado') {
        return res.status(409).json({ erro: 'Este ingresso já foi utilizado.', ingresso: serializarCompra(compra) });
    }

    if (!partidaEmAndamento(compra.Ingresso)) {
        const data = compra.Ingresso ? new Date(compra.Ingresso.dataPartida).toLocaleString('pt-BR') : 'data desconhecida';
        return res.status(400).json({
            erro: `Fora do horário de entrada desta partida (${data}). A entrada é liberada de 12h antes até 6h depois do início.`,
            ingresso: serializarCompra(compra),
        });
    }

    const [validou] = await IngressoCompra.update(
        { statusCheckin: 'utilizado', dataCheckin: new Date(), validadoPor: req.usuario.id },
        { where: { id: compra.id, status: 'aprovado', statusCheckin: 'pendente' } }
    );
    await compra.reload({ include: [Usuario, Ingresso] });

    if (!validou) {
        return res.status(409).json({ erro: 'Este ingresso já foi utilizado.', ingresso: serializarCompra(compra) });
    }

    return res.json({ sucesso: true, ingresso: serializarCompra(compra) });
}

async function validarPorHash(req, res) {
    try {
        const hash = typeof req.body.hash === 'string' ? req.body.hash.trim() : '';
        if (!hash) {
            return res.status(400).json({ erro: 'QR Code vazio ou inválido.' });
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
        const cpf = somenteDigitos(req.body.cpf);
        if (cpf.length !== 11) {
            return res.status(400).json({ erro: 'Informe os 11 números do CPF.' });
        }

        const usuario = await Usuario.findOne({ where: { cpf } });
        const compras = usuario
            ? await IngressoCompra.findAll({
                where: { usuarioId: usuario.id, status: 'aprovado' },
                include: [Usuario, Ingresso],
                order: [['createdAt', 'DESC']],
            })
            : [];

        if (compras.length === 0) {
            return res.status(404).json({ erro: 'Nenhum ingresso pago encontrado para este CPF.' });
        }

        res.json({ ingressos: compras.map(serializarCompra) });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao buscar ingresso pelo CPF.' });
    }
}

async function validarManual(req, res) {
    try {
        const compraId = Number(req.body.compraId);
        const cpf = somenteDigitos(req.body.cpf);
        if (!Number.isInteger(compraId) || compraId < 1 || cpf.length !== 11) {
            return res.status(400).json({ erro: 'Busque o ingresso pelo CPF antes de confirmar a entrada.' });
        }

        const compra = await IngressoCompra.findByPk(compraId, { include: [Usuario, Ingresso] });

        if (!compra || compra.Usuario?.cpf !== cpf) {
            return res.status(404).json({ erro: 'Compra não encontrada para este CPF.' });
        }

        return await validarCompra(compra, req, res);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao validar o ingresso.' });
    }
}

module.exports = { formChecagem, validarPorHash, buscarPorCpf, validarManual, partidaEmAndamento };
