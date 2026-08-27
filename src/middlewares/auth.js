const jwt = require('jsonwebtoken');

function autenticar(req, res, next) {
    const token = req.cookies?.token;

    if (!token) {
        return res.redirect('/login');
    }

    try {
        req.usuario = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (erro) {
        res.clearCookie('token');
        return res.redirect('/login');
    }
}

function apenasAdmin(req, res, next) {
    if (req.usuario?.tipo !== 'admin') {
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

function autenticarApi(req, res, next) {
    const token = req.cookies?.token;

    if (!token) {
        return res.status(401).json({ erro: 'Você precisa estar logado.' });
    }

    try {
        req.usuario = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (erro) {
        return res.status(401).json({ erro: 'Sessão expirada. Faça login novamente.' });
    }
}

module.exports = { autenticar, apenasAdmin, identificarUsuario, autenticarApi };