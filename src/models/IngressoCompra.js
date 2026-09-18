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
        // Status do PAGAMENTO no Mercado Pago: 'pendente' | 'aprovado' | outros retornados pela API.
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
        // Token opaco (não é o payment id) gravado no QR Code enviado por e-mail.
        // Gerado só quando o pagamento é aprovado (ver webhook em pagamentoController.js).
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
    },

    statusCheckin: {
        // Estado da ENTRADA na portaria, independente do status do pagamento acima:
        // 'pendente' (ainda não passou na catraca) | 'utilizado' (já validado por um operador).
        // Um QR cobre a compra inteira (todas as unidades de `quantidade`) — não há controle por assento.
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'pendente'
    },

    dataCheckin: {
        type: DataTypes.DATE,
        allowNull: true
    },

    validadoPor: {
        // Usuario (tipo 'portaria' ou 'admin') que bateu o QR ou confirmou pelo CPF.
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
