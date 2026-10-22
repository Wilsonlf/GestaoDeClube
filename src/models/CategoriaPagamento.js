const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CategoriaPagamento = sequelize.define('CategoriaPagamento', {

    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },

    nome: {
        type: DataTypes.STRING(60),
        allowNull: false,
        unique: true
    }

}, {
    tableName: 'categorias_pagamento',
    freezeTableName: true
});

module.exports = CategoriaPagamento;
