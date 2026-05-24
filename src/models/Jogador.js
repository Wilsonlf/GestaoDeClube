const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Jogador = sequelize.define('Jogador', {

    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },

    nome: {
        type: DataTypes.STRING,
        allowNull: false
    },

    posicao: {
        type: DataTypes.STRING
    },

    foto: {
        type: DataTypes.STRING
    }

});

module.exports = Jogador;