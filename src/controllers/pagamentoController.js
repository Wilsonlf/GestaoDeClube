const { Preference, Payment } = require('mercadopago');
const client = require('../config/mercadopago');
const Pagamento = require('../models/Pagamento');
const Ingresso = require('../models/Ingresso');
const IngressoCompra = require('../models/IngressoCompra');
const { Usuario, SocioTorcedor } = require('../models/Index');
const { obterDescontoIngresso } = require('../utils/socioDesconto');
const { gerarHashQr } = require('../utils/qrToken');
const { enviarIngressoPorEmail } = require('../utils/email');

const PLANOS = {
    ninho: { titulo: 'Sócio Torcedor - Ninho', valor: 19.9 },
    asas_negras: { titulo: 'Sócio Torcedor - Asas Negras', valor: 39.9 },
    voo_supremo: { titulo: 'Sócio Torcedor - Voo Supremo', valor: 79.9 },
};

// Domínio público (túnel ngrok) que o Mercado Pago usa para devolver o torcedor
// e para chamar o webhook. Trocar de túnel exige editar só esta constante.
const BASE_URL = 'https://viewable-clique-avenue.ngrok-free.dev';

// As páginas de retorno (sucesso/pendente/erro) são compartilhadas por dois fluxos de
// pagamento diferentes — assinatura de plano e compra de ingresso — por isso o texto
// varia conforme a query string ?tipo= que vai nas back_urls de cada Preference.
const RETORNOS = {
    plano: {
        sucesso: {
            icone: '✓',
            titulo: 'Pagamento aprovado!',
            mensagem: 'Sua adesão ao Sócio Torcedor foi confirmada. Bem-vindo ao bando!',
        },
        pendente: {
            icone: '…',
            titulo: 'Pagamento pendente',
            mensagem: 'Recebemos seu pedido e estamos aguardando a confirmação do pagamento. Assim que for aprovado, seu plano é ativado automaticamente.',
        },
        erro: {
            icone: '✕',
            titulo: 'Pagamento não concluído',
            mensagem: 'Não foi possível concluir o pagamento. Nenhum valor foi cobrado — você pode tentar novamente quando quiser.',
        },
    },
    ingresso: {
        sucesso: {
            icone: '✓',
            titulo: 'Ingresso confirmado!',
            mensagem: 'Sua compra foi aprovada. Nos vemos no Ninho da Águia!',
        },
        pendente: {
            icone: '…',
            titulo: 'Pagamento pendente',
            mensagem: 'Recebemos seu pedido e estamos aguardando a confirmação do pagamento. Assim que for aprovado, seu ingresso é confirmado automaticamente.',
        },
        erro: {
            icone: '✕',
            titulo: 'Compra não concluída',
            mensagem: 'Não foi possível concluir a compra do ingresso. Nenhum valor foi cobrado — você pode tentar novamente quando quiser.',
        },
    },
};

const LINK_ALTERNATIVO = {
    plano: { href: '/planos', texto: 'Escolher outro plano' },
    ingresso: { href: '/ingressos', texto: 'Ver ingressos disponíveis' },
};

exports.paginaRetorno = (chave) => (req, res) => {
    const tipo = req.query.tipo === 'ingresso' ? 'ingresso' : 'plano';
    const info = RETORNOS[tipo][chave];

    if (!info) {
        return res.redirect('/');
    }

    res.render('pagamento-status', {
        status: chave,
        icone: info.icone,
        titulo: info.titulo,
        mensagem: info.mensagem,
        segundos: 10,
        linkAlternativo: LINK_ALTERNATIVO[tipo],
    });
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
                    success: `${BASE_URL}/pagamento/sucesso?tipo=plano`,
                    failure: `${BASE_URL}/pagamento/erro?tipo=plano`,
                    pending: `${BASE_URL}/pagamento/pendente?tipo=plano`,
                },
                auto_return: 'approved',
                notification_url: `${BASE_URL}/pagamento/webhook`,
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

exports.criarPagamentoIngresso = async (req, res) => {
    try {
        const { ingressoId, quantidade } = req.body;
        const usuarioId = req.usuario.id;
        const qtd = Number(quantidade) || 1;

        if (!ingressoId || qtd < 1) {
            return res.status(400).json({ erro: 'Dados da compra inválidos.' });
        }

        const ingresso = await Ingresso.findByPk(ingressoId);
        if (!ingresso || ingresso.status !== 'ativo') {
            return res.status(404).json({ erro: 'Ingresso indisponível.' });
        }

        const disponiveis = ingresso.quantidadeTotal - ingresso.quantidadeVendida;
        if (qtd > disponiveis) {
            return res.status(400).json({
                erro: disponiveis > 0
                    ? `Restam apenas ${disponiveis} ingresso(s) para esta partida.`
                    : 'Ingressos esgotados para esta partida.',
            });
        }

        // O desconto é sempre recalculado no servidor a partir do plano do sócio
        // logado — nunca confiar em um valor vindo do front-end.
        let desconto = 0;
        const socio = await SocioTorcedor.findOne({ where: { usuarioId, status: 'ativo' } });
        if (socio) {
            desconto = obterDescontoIngresso(socio.plano);
        }

        const valorUnitario = Number((ingresso.valor * (1 - desconto)).toFixed(2));
        const valorTotal = Number((valorUnitario * qtd).toFixed(2));

        const compra = await IngressoCompra.create({
            usuarioId,
            ingressoId: ingresso.id,
            quantidade: qtd,
            valorUnitario,
            valorTotal,
            status: 'pendente',
        });

        const preference = new Preference(client);
        const result = await preference.create({
            body: {
                items: [
                    {
                        title: `Ingresso - ${ingresso.partida}`,
                        quantity: qtd,
                        unit_price: valorUnitario,
                        currency_id: 'BRL',
                    },
                ],
                back_urls: {
                    success: `${BASE_URL}/pagamento/sucesso?tipo=ingresso`,
                    failure: `${BASE_URL}/pagamento/erro?tipo=ingresso`,
                    pending: `${BASE_URL}/pagamento/pendente?tipo=ingresso`,
                },
                auto_return: 'approved',
                notification_url: `${BASE_URL}/pagamento/webhook`,
                external_reference: `ingresso_compra_${compra.id}`,
            },
        });

        compra.mp_preference_id = result.id;
        await compra.save();

        res.json({ preferenceId: result.id });
    } catch (erro) {
        console.error('Erro ao criar compra de ingresso:', erro);
        res.status(500).json({ erro: 'Erro ao iniciar a compra do ingresso.' });
    }
};

exports.webhook = async (req, res) => {
    try {
        const { type, data } = req.query.type ? req.query : req.body;

        if (type === 'payment') {
            const payment = new Payment(client);
            const paymentInfo = await payment.get({ id: data.id });
            const aprovado = paymentInfo.status === 'approved';

            const pagamento = await Pagamento.findOne({
                where: { mp_preference_id: paymentInfo.preference_id },
            });

            if (pagamento) {
                pagamento.mp_payment_id = paymentInfo.id;
                pagamento.status = aprovado ? 'aprovado' : paymentInfo.status;

                if (aprovado) {
                    pagamento.data_pagamento = new Date();
                    await SocioTorcedor.update(
                        { status: 'ativo', dataAssociacao: new Date() },
                        { where: { id: pagamento.socioTorcedorId } }
                    );
                }
                await pagamento.save();
            }

            // Mesma notification_url atende compra de plano e de ingresso — só uma
            // das duas buscas abaixo encontra algo, dependendo da preferência.
            const compra = await IngressoCompra.findOne({
                where: { mp_preference_id: paymentInfo.preference_id },
            });

            if (compra) {
                const jaEstavaAprovado = compra.status === 'aprovado';
                compra.mp_payment_id = paymentInfo.id;
                compra.status = aprovado ? 'aprovado' : paymentInfo.status;

                // O Mercado Pago pode reenviar a mesma notificação mais de uma vez;
                // sem essa guarda o estoque seria debitado em dobro a cada reenvio.
                if (aprovado && !jaEstavaAprovado) {
                    await Ingresso.increment(
                        { quantidadeVendida: compra.quantidade },
                        { where: { id: compra.ingressoId } }
                    );

                    // Um QR é gerado por compra (não por unidade): cobre todas as
                    // pessoas do pedido de uma vez, a portaria valida a compra inteira.
                    compra.hashQr = gerarHashQr();
                }
                await compra.save();

                if (aprovado && !jaEstavaAprovado) {
                    try {
                        const [usuarioComprador, ingressoComprado] = await Promise.all([
                            Usuario.findByPk(compra.usuarioId),
                            Ingresso.findByPk(compra.ingressoId),
                        ]);
                        if (usuarioComprador && ingressoComprado) {
                            await enviarIngressoPorEmail({
                                usuario: usuarioComprador,
                                ingresso: ingressoComprado,
                                compra,
                            });
                        }
                    } catch (erroEmail) {
                        // Falha no envio do e-mail não pode derrubar o webhook — o
                        // pagamento já foi processado e o ingresso já existe no banco.
                        console.error('Erro ao enviar e-mail do ingresso:', erroEmail);
                    }
                }
            }
        }

        res.sendStatus(200);
    } catch (erro) {
        console.error('Erro no webhook:', erro);
        res.sendStatus(500);
    }
};