const { Preference, Payment } = require('mercadopago');
const client = require('../config/mercadopago');
const Pagamento = require('../models/Pagamento');
const { SocioTorcedor } = require('../models');

const PLANOS = {
    bronze: { titulo: 'Sócio Torcedor - Ninho', valor: 19.9 },
    prata: { titulo: 'Sócio Torcedor - Asas Negras', valor: 39.9 },
    ouro: { titulo: 'Sócio Torcedor - Voo Supremo', valor: 79.9 },
};

exports.criarPagamento = async (req, res) => {
    try {
        const { plano } = req.body;
        const usuarioId = req.usuario.id;

        const planoInfo = PLANOS[plano];
        if (!planoInfo) {
            return res.status(400).json({ erro: 'Plano inválido' });
        }

        const [socioTorcedor] = await SocioTorcedor.findOrCreate({
            where: { usuarioId },
            defaults: {
                plano,
                dataAssociacao: new Date(),
                status: 'pendente',
            },
        });

        const preference = new Preference(client);
        const result = await preference.create({
            body: {
                items: [
                    {
                        title: planoInfo.titulo,
                        quantity: 1,
                        unit_price: planoInfo.valor,
                        currency_id: 'BRL',
                    },
                ],
                back_urls: {
                    success: 'http://localhost:3000/pagamento/sucesso',
                    failure: 'http://localhost:3000/pagamento/erro',
                    pending: 'http://localhost:3000/pagamento/pendente',
                },
                auto_return: 'approved',
                notification_url: 'https://SEU_DOMINIO_OU_NGROK/pagamento/webhook',
                external_reference: String(socioTorcedor.id),
            },
        });

        await Pagamento.create({
            socioTorcedorId: socioTorcedor.id,
            descricao: planoInfo.titulo,
            valor: planoInfo.valor,
            status: 'pendente',
            mp_preference_id: result.id,
        });

        res.json({ preferenceId: result.id });
    } catch (erro) {
        console.error('Erro ao criar pagamento:', erro);
        res.status(500).json({ erro: 'Erro ao criar pagamento' });
    }
};

exports.webhook = async (req, res) => {
    try {
        const { type, data } = req.query.type ? req.query : req.body;

        if (type === 'payment') {
            const payment = new Payment(client);
            const paymentInfo = await payment.get({ id: data.id });

            const pagamento = await Pagamento.findOne({
                where: { mp_preference_id: paymentInfo.preference_id },
            });

            if (pagamento) {
                pagamento.mp_payment_id = paymentInfo.id;
                pagamento.status = paymentInfo.status === 'approved' ? 'aprovado' : paymentInfo.status;

                if (paymentInfo.status === 'approved') {
                    pagamento.data_pagamento = new Date();
                    await SocioTorcedor.update(
                        { status: 'ativo', dataAssociacao: new Date() },
                        { where: { id: pagamento.socioTorcedorId } }
                    );
                }
                await pagamento.save();
            }
        }

        res.sendStatus(200);
    } catch (erro) {
        console.error('Erro no webhook:', erro);
        res.sendStatus(500);
    }
};