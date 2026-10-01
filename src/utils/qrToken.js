const crypto = require('crypto');

function gerarHashQr() {
    return crypto.randomBytes(24).toString('hex');
}

module.exports = { gerarHashQr };
