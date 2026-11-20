const crypto = require('crypto');
const bcrypt = require('bcrypt');
const Usuario = require('../models/Usuario');
const { validarCadastro } = require('../utils/validacaoCadastro');
const { chaveLogin, minutosBloqueado, registrarFalha, limparFalhas } = require('../utils/limiteLogin');
const { CUSTO_BCRYPT, gerarToken, opcoesCookie } = require('../utils/sessao');

const HASH_FALSO = bcrypt.hashSync(crypto.randomBytes(16).toString('hex'), CUSTO_BCRYPT);

const MAX_CONTAS_POR_IP = 10;
const MAX_FALHAS_LOGIN_POR_IP = 30;
const MENSAGEM_CADASTRO_RECUSADO = 'Não foi possível concluir o cadastro com esses dados. Se você já tem conta, entre ou use "Esqueci minha senha".';

async function cadastrar(req, res) {
    try {
        const chave = `cadastro|${req.ip}`;
        const chaveContasCriadas = `cadastro-ok|${req.ip}`;
        const minutos = Math.max(minutosBloqueado(chave), minutosBloqueado(chaveContasCriadas, MAX_CONTAS_POR_IP));
        if (minutos > 0) {
            return res.status(429).json({ erro: `Muitas tentativas de cadastro. Tente novamente em ${minutos} minuto(s).` });
        }

        const { erro, dados } = validarCadastro(req.body);
        if (erro) {
            return res.status(400).json({ erro });
        }
        const { nome, email, senha, cpf, telefone } = dados;

        const existente = await Usuario.findOne({ where: { email } });
        const cpfEmUso = existente ? null : await Usuario.findOne({ where: { cpf } });
        if (existente || cpfEmUso) {
            registrarFalha(chave);
            return res.status(400).json({ erro: MENSAGEM_CADASTRO_RECUSADO });
        }

        const senhaHash = await bcrypt.hash(senha, CUSTO_BCRYPT);
        const usuario = await Usuario.create({
            nome,
            email,
            senha: senhaHash,
            cpf,
            telefone,
            tipo: 'comum'
        });
        registrarFalha(chaveContasCriadas, MAX_CONTAS_POR_IP);

        res.status(201).json({ sucesso: true, id: usuario.id });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao cadastrar. Tente novamente.' });
    }
}

async function login(req, res) {
    try {
        const { email, senha } = req.body;

        if (typeof email !== 'string' || typeof senha !== 'string' || !email.trim() || !senha) {
            return res.status(400).json({ erro: 'Informe e-mail e senha.' });
        }

        const chave = chaveLogin(req, email);
        const chaveIp = `login-ip|${req.ip}`;
        const minutos = Math.max(minutosBloqueado(chave), minutosBloqueado(chaveIp, MAX_FALHAS_LOGIN_POR_IP));
        if (minutos > 0) {
            return res.status(429).json({
                erro: `Muitas tentativas de login. Tente novamente em ${minutos} minuto(s).`,
            });
        }

        const usuario = await Usuario.findOne({ where: { email: email.trim().toLowerCase() } });
        const senhaValida = await bcrypt.compare(senha, usuario ? usuario.senha : HASH_FALSO);
        if (!usuario || !senhaValida) {
            registrarFalha(chave);
            registrarFalha(chaveIp, MAX_FALHAS_LOGIN_POR_IP);
            return res.status(401).json({ erro: 'E-mail ou senha inválidos.' });
        }
        limparFalhas(chave);

        res.cookie('token', gerarToken(usuario), opcoesCookie());

        let destino = '/';
        if (usuario.tipo === 'admin') destino = '/admin/dashboard';
        if (usuario.tipo === 'portaria') destino = '/admin/checagem';
        res.json({ sucesso: true, redirecionarPara: destino });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao entrar. Tente novamente.' });
    }
}

function logout(req, res) {
    res.clearCookie('token');
    res.redirect('/login');
}

module.exports = { cadastrar, login, logout };
