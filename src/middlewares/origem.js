const METODOS_SEGUROS = ['GET', 'HEAD', 'OPTIONS'];
const ROTAS_EXTERNAS = ['/pagamento/webhook'];

function hostDaOrigem(valor) {
    try {
        return new URL(valor).host;
    } catch (erro) {
        return null;
    }
}

function verificarOrigem(req, res, next) {
    if (METODOS_SEGUROS.includes(req.method) || ROTAS_EXTERNAS.includes(req.path)) {
        return next();
    }

    const origem = req.get('origin') || req.get('referer');
    if (!origem) {
        return next();
    }

    if (hostDaOrigem(origem) !== req.get('host')) {
        return res.status(403).send('Requisição bloqueada: origem não permitida.');
    }

    next();
}

module.exports = { verificarOrigem };
