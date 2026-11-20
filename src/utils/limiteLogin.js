const MAX_TENTATIVAS = 5;
const JANELA_MS = 15 * 60 * 1000;
const MAX_CHAVES = 10000;

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

function removerVencidos() {
    const agora = Date.now();
    for (const [chave, registro] of tentativas) {
        if (registro.expiraEm <= agora) tentativas.delete(chave);
    }
}

function abrirEspaco() {
    removerVencidos();
    if (tentativas.size < MAX_CHAVES) return;
    for (const [chave, registro] of tentativas) {
        if (!registro.bloqueado) {
            tentativas.delete(chave);
            return;
        }
    }
}

function minutosBloqueado(chave, maximo = MAX_TENTATIVAS) {
    const registro = obterRegistro(chave);
    if (!registro || registro.falhas < maximo) return 0;
    return Math.ceil((registro.expiraEm - Date.now()) / 60000);
}

function registrarFalha(chave, maximo = MAX_TENTATIVAS) {
    const registro = obterRegistro(chave);
    if (registro) {
        registro.falhas += 1;
        if (registro.falhas >= maximo && !registro.bloqueado) {
            registro.bloqueado = true;
            registro.expiraEm = Date.now() + JANELA_MS;
        }
        return;
    }

    if (tentativas.size >= MAX_CHAVES) {
        abrirEspaco();
    }
    tentativas.set(chave, { falhas: 1, bloqueado: maximo <= 1, expiraEm: Date.now() + JANELA_MS });
}

function limparFalhas(chave) {
    tentativas.delete(chave);
}

setInterval(removerVencidos, JANELA_MS).unref();

module.exports = { chaveLogin, minutosBloqueado, registrarFalha, limparFalhas, MAX_TENTATIVAS };
