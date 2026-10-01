const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const IngressoCompra = sequelize.define('IngressoCompra', {

    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },

    usuarioId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'usuarios',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },

    ingressoId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'ingressos',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },

    quantidade: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
    },

    valorUnitario: {
        type: DataTypes.FLOAT,
        allowNull: false
    },

    valorTotal: {
        type: DataTypes.FLOAT,
        allowNull: false
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
    },

    hashQr: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
    },

    statusCheckin: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'pendente'
    },

    dataCheckin: {
        type: DataTypes.DATE,
        allowNull: true
    },

    validadoPor: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'usuarios',
            key: 'id'
        },
        onDelete: 'SET NULL'
    }

}, {
    tableName: 'ingresso_compras',
    freezeTableName: true
});

const Usuario = require('./Usuario');
const Ingresso = require('./Ingresso');

IngressoCompra.belongsTo(Usuario, { foreignKey: 'usuarioId' });
IngressoCompra.belongsTo(Usuario, { foreignKey: 'validadoPor', as: 'operadorCheckin' });
IngressoCompra.belongsTo(Ingresso, { foreignKey: 'ingressoId' });
Ingresso.hasMany(IngressoCompra, { foreignKey: 'ingressoId' });

module.exports = IngressoCompra;
