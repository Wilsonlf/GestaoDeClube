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

    valor: {
        type: DataTypes.FLOAT,
        allowNull: false
    },

    quantidade: {
        type: DataTypes.INTEGER,
        allowNull: false
    }

});

module.exports = Ingresso;