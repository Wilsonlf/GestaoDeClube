const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Ingresso = sequelize.define('Ingresso', {

    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },

    partida: {
        type: DataTypes.STRING,
        allowNull: false
    },

    competicao: {
        type: DataTypes.STRING,
        allowNull: true
    },

    dataPartida: {
        type: DataTypes.DATE,
        allowNull: false
    },

    local: {
        type: DataTypes.STRING,
        allowNull: false
    },

    valor: {
        type: DataTypes.FLOAT,
        allowNull: false
    },

    quantidadeTotal: {
        type: DataTypes.INTEGER,
        allowNull: false
    },

    quantidadeVendida: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },

    status: {
        type: DataTypes.STRING,
        defaultValue: 'ativo'
    }

}, {
    tableName: 'ingressos',
    freezeTableName: true
});

module.exports = Ingresso;
