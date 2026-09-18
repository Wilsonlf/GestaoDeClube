const crypto = require('crypto');

// Token opaco gravado em IngressoCompra.hashQr e codificado no QR Code enviado
// por e-mail. Não carrega dado nenhum (nada de id/valor embutido) — a portaria
// só descobre a compra correspondente consultando o banco por este valor, então
// o QR sozinho não serve pra forjar nem adulterar um ingresso.
function gerarHashQr() {
    return crypto.randomBytes(24).toString('hex');
}

module.exports = { gerarHashQr };
