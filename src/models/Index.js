const Usuario = require('./Usuario');
const SocioTorcedor = require('./SocioTorcedor');


Usuario.hasOne(SocioTorcedor, {
    foreignKey: 'usuarioId',
    onDelete: 'CASCADE'
});


SocioTorcedor.belongsTo(Usuario, {
    foreignKey: 'usuarioId'
});


module.exports = {
    Usuario,
    SocioTorcedor
};