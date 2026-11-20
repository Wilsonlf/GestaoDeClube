const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const CUSTO_BCRYPT = 10;
const DURACAO_SESSAO_MS = 8 * 60 * 60 * 1000;

function versaoSenha(senhaHash) {
    return crypto.createHash('sha256').update(String(senhaHash)).digest('hex').slice(0, 16);
}

function gerarToken(usuario) {
    return jwt.sign(
        { id: usuario.id, nome: usuario.nome, email: usuario.email, tipo: usuario.tipo, sv: versaoSenha(usuario.senha) },
        process.env.JWT_SECRET,
        { expiresIn: DURACAO_SESSAO_MS / 1000 }
    );
}

function opcoesCookie() {
    return {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: DURACAO_SESSAO_MS
    };
}

module.exports = { CUSTO_BCRYPT, versaoSenha, gerarToken, opcoesCookie };
