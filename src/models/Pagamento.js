const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Pagamento = sequelize.define('Pagamento', {

    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },

    socioTorcedorId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'sociotorcedores',
            key: 'id'
        },
        onDelete: 'CASCADE'
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
    },

    status: {
        type: DataTypes.STRING,
        defaultValue: 'pendente'
    },

    mp_preference_id: {
        type: DataTypes.STRING
    },

    mp_payment_id: {
        type: DataTypes.STRING
    }

});

const SocioTorcedor = require('./SocioTorcedor');

Pagamento.belongsTo(SocioTorcedor, { foreignKey: 'socioTorcedorId' });
SocioTorcedor.hasMany(Pagamento, { foreignKey: 'socioTorcedorId' });

module.exports = Pagamento;