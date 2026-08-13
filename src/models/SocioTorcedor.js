const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SocioTorcedor = sequelize.define('SocioTorcedor', {

    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },

    usuarioId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'usuarios',
            key: 'id'
        },
        onDelete: 'SET NULL'
    },

    plano: {
        type: DataTypes.STRING,
        allowNull: false
    },

    dataAssociacao: {
        type: DataTypes.DATE,
        allowNull: false
    },

    status: {
        type: DataTypes.STRING,
        defaultValue: 'ativo'
    }

}, {
    tableName: 'sociotorcedores',
    freezeTableName: true
});

module.exports = SocioTorcedor;