const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Usuario = sequelize.define('Usuario', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },

    nome: {
        type: DataTypes.STRING,
        allowNull: false
    },

    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },

    senha: {
        type: DataTypes.STRING,
        allowNull: false
    },

    cpf: {
        type: DataTypes.STRING,
        allowNull: true
    },

    telefone: {
        type: DataTypes.STRING,
        allowNull: true
    },

    tipo: {
        type: DataTypes.ENUM('comum', 'socio', 'admin'),
        allowNull: false,
        defaultValue: 'comum'
    }

}, {
    tableName: 'usuarios',
    freezeTableName: true
});

module.exports = Usuario;