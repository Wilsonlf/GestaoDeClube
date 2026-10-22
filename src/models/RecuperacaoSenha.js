const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Usuario = require('./Usuario');

const RecuperacaoSenha = sequelize.define('RecuperacaoSenha', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },

    usuarioId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },

    tokenHash: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true
    },

    expiraEm: {
        type: DataTypes.DATE,
        allowNull: false
    }

}, {
    tableName: 'recuperacoes_senha',
    freezeTableName: true
});

RecuperacaoSenha.belongsTo(Usuario, { foreignKey: 'usuarioId', onDelete: 'CASCADE' });

module.exports = RecuperacaoSenha;
