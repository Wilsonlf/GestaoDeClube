const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SocioTorcedor = sequelize.define('SocioTorcedor', {

    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },

    nome: {
        type: DataTypes.STRING,
        allowNull: false
    },

    cpf: {
        type: DataTypes.STRING,
        allowNull: false
    },

    telefone: {
        type: DataTypes.STRING
    },

    email: {
        type: DataTypes.STRING
    }

});

module.exports = SocioTorcedor;