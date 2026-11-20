const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
const { versaoSenha } = require('../utils/sessao');

async function carregarUsuarioDoToken(token) {
    let dados;
    try {
        dados = jwt.verify(token, process.env.JWT_SECRET);
    } catch (erro) {
        return null;
    }

    const usuario = await Usuario.findByPk(dados.id, {
        attributes: ['id', 'nome', 'email', 'tipo', 'senha'],
    });
    if (!usuario || dados.sv !== versaoSenha(usuario.senha)) return null;

    return { id: usuario.id, nome: usuario.nome, email: usuario.email, tipo: usuario.tipo };
}

async function autenticar(req, res, next) {
    const token = req.cookies?.token;

    if (!token) {
        return res.redirect('/login');
    }

    try {
        const usuario = await carregarUsuarioDoToken(token);
        if (!usuario) {
            res.clearCookie('token');
            return res.redirect('/login');
        }
        req.usuario = usuario;
        next();
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao verificar sessão.');
    }
}

function apenasAdmin(req, res, next) {
    if (req.usuario?.tipo !== 'admin') {
        return res.status(403).send('Acesso restrito a administradores.');
    }
    next();
}

function apenasAdminOuPortaria(req, res, next) {
    if (req.usuario?.tipo !== 'admin' && req.usuario?.tipo !== 'portaria') {
        return res.status(403).send('Acesso restrito a administradores.');
    }
    next();
}

async function identificarUsuario(req, res, next) {
    const token = req.cookies?.token;
    req.usuario = null;
    res.locals.usuario = null;
    res.locals.usuarioLogado = null;

    if (!token) {
        return next();
    }

    try {
        const usuario = await carregarUsuarioDoToken(token);
        if (usuario) {
            req.usuario = usuario;
            res.locals.usuario = usuario;
            res.locals.usuarioLogado = usuario;
        } else {
            res.clearCookie('token');
        }
        next();
    } catch (erro) {
        next(erro);
    }
}

async function autenticarApi(req, res, next) {
    const token = req.cookies?.token;

    if (!token) {
        return res.status(401).json({ erro: 'Você precisa estar logado.' });
    }

    try {
        const usuario = await carregarUsuarioDoToken(token);
        if (!usuario) {
            res.clearCookie('token');
            return res.status(401).json({ erro: 'Sessão expirada. Faça login novamente.' });
        }
        req.usuario = usuario;
        next();
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao verificar sessão.' });
    }
}

module.exports = { autenticar, apenasAdmin, apenasAdminOuPortaria, identificarUsuario, autenticarApi };
