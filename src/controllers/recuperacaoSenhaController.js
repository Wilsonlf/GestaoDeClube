const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const Usuario = require('../models/Usuario');
const RecuperacaoSenha = require('../models/RecuperacaoSenha');
const { validarSenha } = require('../utils/validacaoCadastro');
const { enviarRecuperacaoSenha } = require('../utils/email');
const { minutosBloqueado, registrarFalha } = require('../utils/limiteLogin');

const VALIDADE_TOKEN_MS = 60 * 60 * 1000;

const APP_URL = (process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');

const RESPOSTA_GENERICA = 'Se este e-mail estiver cadastrado, você vai receber um link para redefinir a senha em instantes.';

function hashToken(token) {
    return crypto.createHash('sha256').update(String(token)).digest('hex');
}

async function buscarPedidoValido(token) {
    if (!token) return null;
    return RecuperacaoSenha.findOne({
        where: { tokenHash: hashToken(token), expiraEm: { [Op.gt]: new Date() } },
    });
}

exports.paginaEsqueciSenha = (req, res) => {
    res.render('esqueci-senha');
};

exports.solicitar = async (req, res) => {
    try {
        const email = String(req.body.email || '').trim().toLowerCase();
        if (!email) {
            return res.status(400).json({ erro: 'Informe seu e-mail.' });
        }

        const chave = `recuperacao|${req.ip}|${email}`;
        const minutos = minutosBloqueado(chave);
        if (minutos > 0) {
            return res.status(429).json({
                erro: `Muitos pedidos para este e-mail. Tente novamente em ${minutos} minuto(s).`,
            });
        }
        registrarFalha(chave);

        const usuario = await Usuario.findOne({ where: { email } });

        if (usuario) {
            const token = crypto.randomBytes(32).toString('hex');

            await RecuperacaoSenha.destroy({ where: { usuarioId: usuario.id } });
            await RecuperacaoSenha.create({
                usuarioId: usuario.id,
                tokenHash: hashToken(token),
                expiraEm: new Date(Date.now() + VALIDADE_TOKEN_MS),
            });

            try {
                await enviarRecuperacaoSenha({ usuario, link: `${APP_URL}/redefinir-senha/${token}` });
            } catch (erroEmail) {
                console.error('Erro ao enviar e-mail de recuperação de senha:', erroEmail);
            }
        }

        res.json({ sucesso: true, mensagem: RESPOSTA_GENERICA });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao processar o pedido. Tente novamente.' });
    }
};

exports.paginaRedefinir = async (req, res) => {
    try {
        const pedido = await buscarPedidoValido(req.params.token);
        res.render('redefinir-senha', { token: pedido ? req.params.token : null });
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao carregar a página.');
    }
};

exports.redefinir = async (req, res) => {
    try {
        const { token, senha } = req.body;

        const pedido = await buscarPedidoValido(token);
        if (!pedido) {
            return res.status(400).json({ erro: 'Link inválido ou expirado. Peça uma nova redefinição.' });
        }

        const erroSenha = validarSenha(senha);
        if (erroSenha) {
            return res.status(400).json({ erro: erroSenha });
        }

        const senhaHash = await bcrypt.hash(String(senha), 10);
        await Usuario.update({ senha: senhaHash }, { where: { id: pedido.usuarioId } });

        await RecuperacaoSenha.destroy({ where: { usuarioId: pedido.usuarioId } });

        res.json({ sucesso: true, redirecionarPara: '/login' });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao redefinir a senha. Tente novamente.' });
    }
};
