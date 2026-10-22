const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');

async function carregarUsuarioDoToken(token) {
    let dados;
    try {
        dados = jwt.verify(token, process.env.JWT_SECRET);
    } catch (erro) {
        return null;
    }

    const usuario = await Usuario.findByPk(dados.id, {
        attributes: ['id', 'nome', 'email', 'tipo'],
    });
    if (!usuario) return null;

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

function identificarUsuario(req, res, next) {
    const token = req.cookies?.token;
    res.locals.usuario = null;

    if (token) {
        try {
            req.usuario = jwt.verify(token, process.env.JWT_SECRET);
            res.locals.usuario = req.usuario;
        } catch (erro) {
            req.usuario = null;
        }
    }

    next();
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
