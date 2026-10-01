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

    numero: {
        type: DataTypes.INTEGER
    },

    posicao: {
        type: DataTypes.STRING
    },

    foto: {
        type: DataTypes.STRING
    },

    ordem: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    }

} , {
    tableName: 'jogadores',
    freezeTableName: true
});

module.exports = Jogador;