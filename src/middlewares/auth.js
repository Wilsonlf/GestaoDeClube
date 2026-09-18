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

// Portão de entrada do /admin: além de admin, deixa passar também o operador de
// portaria — que só vai conseguir andar dentro das rotas /admin/checagem porque
// as demais rotas de admin.routes.js exigem `apenasAdmin` individualmente.
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

module.exports = { autenticar, apenasAdmin, apenasAdminOuPortaria, identificarUsuario, autenticarApi };