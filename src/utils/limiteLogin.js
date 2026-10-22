const MAX_TENTATIVAS = 5;
const JANELA_MS = 15 * 60 * 1000;

const tentativas = new Map();

function chaveLogin(req, email) {
    return `${req.ip}|${String(email || '').trim().toLowerCase()}`;
}

function obterRegistro(chave) {
    const registro = tentativas.get(chave);
    if (registro && registro.expiraEm <= Date.now()) {
        tentativas.delete(chave);
        return null;
    }
    return registro;
}

function minutosBloqueado(chave) {
    const registro = obterRegistro(chave);
    if (!registro || registro.falhas < MAX_TENTATIVAS) return 0;
    return Math.ceil((registro.expiraEm - Date.now()) / 60000);
}

function registrarFalha(chave) {
    const registro = obterRegistro(chave);
    if (registro) {
        registro.falhas += 1;
    } else {
        tentativas.set(chave, { falhas: 1, expiraEm: Date.now() + JANELA_MS });
    }
}

function limparFalhas(chave) {
    tentativas.delete(chave);
}

setInterval(() => {
    const agora = Date.now();
    for (const [chave, registro] of tentativas) {
        if (registro.expiraEm <= agora) tentativas.delete(chave);
    }
}, JANELA_MS).unref();

module.exports = { chaveLogin, minutosBloqueado, registrarFalha, limparFalhas, MAX_TENTATIVAS };
