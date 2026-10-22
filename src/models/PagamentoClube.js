const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PagamentoClube = sequelize.define('PagamentoClube', {

    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },

    descricao: {
        type: DataTypes.STRING,
        allowNull: false
    },

    categoria: {
        type: DataTypes.STRING,
        allowNull: false
    },

    valor: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },

    dataPagamento: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },

    observacao: {
        type: DataTypes.TEXT,
        allowNull: true
    }

}, {
    tableName: 'pagamentos_clube',
    freezeTableName: true
});

module.exports = PagamentoClube;
