const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Noticia = sequelize.define('Noticia', {

    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },

    titulo: {
        type: DataTypes.STRING,
        allowNull: false
    },

    conteudo: {
        type: DataTypes.TEXT,
        allowNull: false
    }

});

module.exports = Noticia;