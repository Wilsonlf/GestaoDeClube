const Usuario = require('../models/Usuario');

async function marcarComoSocio(usuarioId, transaction) {
    if (!usuarioId) return;
    await Usuario.update({ tipo: 'socio' }, { where: { id: usuarioId, tipo: 'comum' }, transaction });
}

async function desmarcarComoSocio(usuarioId, transaction) {
    if (!usuarioId) return;
    await Usuario.update({ tipo: 'comum' }, { where: { id: usuarioId, tipo: 'socio' }, transaction });
}

module.exports = { marcarComoSocio, desmarcarComoSocio };
