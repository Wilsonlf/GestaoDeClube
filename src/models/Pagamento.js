const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Pagamento = sequelize.define('Pagamento', {

    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },

    descricao: {
        type: DataTypes.STRING,
        allowNull: false
    },

    valor: {
        type: DataTypes.FLOAT,
        allowNull: false
    },

    data_pagamento: {
        type: DataTypes.DATE
    }

});

module.exports = Pagamento;