const jwt = require('jsonwebtoken');

function verificarLogin(req, res, next) {
    const token = req.cookies?.token;
    res.locals.usuarioLogado = null;

    if (token) {
        try {
            const dados = jwt.verify(token, process.env.JWT_SECRET);
            req.usuario = dados;
            res.locals.usuarioLogado = dados;
        } catch (erro) {
            res.clearCookie('token');
        }
    }

    next();
}

module.exports = verificarLogin;