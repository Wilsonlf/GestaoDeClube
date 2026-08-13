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

module.exports = { autenticar, apenasAdmin };