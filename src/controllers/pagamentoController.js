const { Op } = require('sequelize');
const { Preference, Payment, PaymentRefund, WebhookSignatureValidator } = require('mercadopago');
const sequelize = require('../config/database');
const client = require('../config/mercadopago');
const { APP_URL } = require('../config/ambiente');
const { obterPlano, listarPlanos } = require('../config/planos');
const {
    STATUS_ESTORNO,
    STATUS_NAO_REAPROVAVEIS,
    STATUS_NAO_SOBRESCREVIVEIS,
} = require('../config/statusPagamento');
const Pagamento = require('../models/Pagamento');
const Ingresso = require('../models/Ingresso');
const IngressoCompra = require('../models/IngressoCompra');
const { Usuario, SocioTorcedor } = require('../models/Index');
const { aplicarDesconto, descontoDoUsuario } = require('../utils/socioDesconto');
const { marcarComoSocio, desmarcarComoSocio } = require('../utils/tipoUsuario');
const { minutosBloqueado, registrarFalha } = require('../utils/limiteLogin');
const { gerarHashQr } = require('../utils/qrToken');
const { proximoVencimento, vencimentoAnterior } = require('../utils/validadePlano');
const { enviarIngressoPorEmail } = require('../utils/email');
const {
    PRAZO_COMPRA_PENDENTE_MS,
    MAX_INGRESSOS_POR_COMPRA,
    MAX_RESERVAS_POR_USUARIO,
    quantidadeReservada,
    reservasAtivasDoUsuario,
    calcularDisponiveis,
} = require('../utils/estoqueIngresso');

const PREFIXO_REF_PLANO = 'pagamento_';
const PREFIXO_REF_INGRESSO = 'ingresso_compra_';
const REGEX_REF_PLANO = /^pagamento_(\d+)$/;
const REGEX_REF_INGRESSO = /^ingresso_compra_(\d+)$/;
const MAX_PEDIDOS_DE_PAGAMENTO = 10;

const RETORNOS = {
    plano: {
        sucesso: {
            icone: '✓',
            titulo: 'Pagamento recebido!',
            mensagem: 'O Mercado Pago aprovou seu pagamento. Seu plano é ativado (ou renovado) por 30 dias assim que recebermos a confirmação, normalmente em poucos instantes. Bem-vindo ao bando!',
        },
        pendente: {
            icone: '…',
            titulo: 'Pagamento pendente',
            mensagem: 'Recebemos seu pedido e estamos aguardando a confirmação do pagamento. Assim que for aprovado, seu plano é ativado automaticamente por 30 dias.',
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
            titulo: 'Pagamento recebido!',
            mensagem: 'O Mercado Pago aprovou seu pagamento. Assim que confirmarmos, o ingresso com o QR Code chega no seu e-mail e fica disponível em "Meus ingressos", no menu do site. Nos vemos no Ninho da Águia!',
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
    ingressoComprado: { href: '/meus-ingressos', texto: 'Ver meus ingressos' },
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
        linkAlternativo: tipo === 'ingresso' && chave !== 'erro' ? LINK_ALTERNATIVO.ingressoComprado : LINK_ALTERNATIVO[tipo],
    });
};

function erroHttp(status, mensagem) {
    const erro = new Error(mensagem);
    erro.status = status;
    return erro;
}

function limitarPedidos(usuarioId) {
    const chave = `pedido-pagamento|${usuarioId}`;
    const minutos = minutosBloqueado(chave, MAX_PEDIDOS_DE_PAGAMENTO);
    if (minutos > 0) {
        throw erroHttp(429, `Muitas tentativas de pagamento. Tente novamente em ${minutos} minuto(s).`);
    }
    registrarFalha(chave, MAX_PEDIDOS_DE_PAGAMENTO);
}

function montarPreference({ titulo, quantidade, valorUnitario, tipo, referencia }) {
    const expiraEm = new Date(Date.now() + PRAZO_COMPRA_PENDENTE_MS).toISOString();
    return {
        items: [
            {
                title: titulo,
                quantity: quantidade,
                unit_price: valorUnitario,
                currency_id: 'BRL',
            },
        ],
        back_urls: {
            success: `${APP_URL}/pagamento/sucesso?tipo=${tipo}`,
            failure: `${APP_URL}/pagamento/erro?tipo=${tipo}`,
            pending: `${APP_URL}/pagamento/pendente?tipo=${tipo}`,
        },
        auto_return: 'approved',
        notification_url: `${APP_URL}/pagamento/webhook`,
        external_reference: referencia,
        expires: true,
        expiration_date_to: expiraEm,
        date_of_expiration: expiraEm,
        payment_methods: { excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }] },
    };
}

function planoDoPagamento(pagamento) {
    return listarPlanos().find((p) => p.titulo === pagamento.descricao) || null;
}

function valorConfere(pagamentoMp, valorEsperado) {
    return pagamentoMp.currency_id === 'BRL'
        && Number(pagamentoMp.transaction_amount) + 0.01 >= Number(valorEsperado);
}

function responderErro(res, erro, mensagemPadrao) {
    if (erro.status) {
        return res.status(erro.status).json({ erro: erro.message });
    }
    console.error(mensagemPadrao, erro);
    res.status(500).json({ erro: mensagemPadrao });
}

exports.criarPagamento = async (req, res) => {
    try {
        const planoInfo = obterPlano(req.body.plano);
        const usuarioId = req.usuario.id;

        if (!planoInfo) {
            return res.status(400).json({ erro: 'Plano inválido.' });
        }
        limitarPedidos(usuarioId);

        let socioTorcedor = await SocioTorcedor.findOne({ where: { usuarioId } });
        if (!socioTorcedor) {
            socioTorcedor = await SocioTorcedor.create({
                usuarioId,
                plano: planoInfo.chave,
                dataAssociacao: new Date(),
                status: 'pendente',
            });
        }

        const pendenteAberto = await Pagamento.findOne({
            where: {
                socioTorcedorId: socioTorcedor.id,
                descricao: planoInfo.titulo,
                status: 'pendente',
                mp_preference_id: { [Op.ne]: null },
                createdAt: { [Op.gt]: new Date(Date.now() - PRAZO_COMPRA_PENDENTE_MS) },
            },
            order: [['createdAt', 'DESC']],
        });
        if (pendenteAberto) {
            return res.json({ preferenceId: pendenteAberto.mp_preference_id });
        }

        const pagamento = await Pagamento.create({
            socioTorcedorId: socioTorcedor.id,
            descricao: planoInfo.titulo,
            valor: planoInfo.valor,
            status: 'pendente',
        });

        try {
            const result = await new Preference(client).create({
                body: montarPreference({
                    titulo: `${planoInfo.titulo} (30 dias)`,
                    quantidade: 1,
                    valorUnitario: planoInfo.valor,
                    tipo: 'plano',
                    referencia: `${PREFIXO_REF_PLANO}${pagamento.id}`,
                }),
            });
            pagamento.mp_preference_id = result.id;
            await pagamento.save();
            res.json({ preferenceId: result.id });
        } catch (erroMp) {
            await pagamento.update({ status: 'cancelado' });
            throw erroMp;
        }
    } catch (erro) {
        responderErro(res, erro, 'Erro ao criar pagamento. Tente novamente.');
    }
};

exports.criarPagamentoIngresso = async (req, res) => {
    try {
        const { ingressoId } = req.body;
        const usuarioId = req.usuario.id;
        const qtd = Number(req.body.quantidade);

        if (!ingressoId || !Number.isInteger(qtd) || qtd < 1 || qtd > MAX_INGRESSOS_POR_COMPRA) {
            return res.status(400).json({ erro: `Escolha uma quantidade inteira de 1 a ${MAX_INGRESSOS_POR_COMPRA} ingressos.` });
        }
        limitarPedidos(usuarioId);

        const desconto = await descontoDoUsuario(usuarioId);

        const { compra, ingresso } = await sequelize.transaction(async (transaction) => {
            const ingresso = await Ingresso.findByPk(ingressoId, { transaction, lock: transaction.LOCK.UPDATE });
            if (!ingresso || ingresso.status !== 'ativo') {
                throw erroHttp(404, 'Ingresso indisponível.');
            }
            if (new Date(ingresso.dataPartida) < new Date()) {
                throw erroHttp(400, 'As vendas para esta partida já foram encerradas.');
            }

            await IngressoCompra.update(
                { status: 'cancelado' },
                { where: { usuarioId, ingressoId: ingresso.id, status: 'pendente' }, transaction }
            );

            const reservasDoUsuario = await reservasAtivasDoUsuario(usuarioId, transaction);
            if (reservasDoUsuario >= MAX_RESERVAS_POR_USUARIO) {
                throw erroHttp(429, 'Você já tem compras aguardando pagamento. Conclua o pagamento delas ou aguarde 30 minutos.');
            }

            const reservados = await quantidadeReservada(ingresso.id, transaction);
            const disponiveis = calcularDisponiveis(ingresso, reservados);
            if (qtd > disponiveis) {
                throw erroHttp(400, disponiveis > 0
                    ? `Restam apenas ${disponiveis} ingresso(s) para esta partida.`
                    : 'Ingressos esgotados para esta partida.');
            }

            const valorUnitario = aplicarDesconto(ingresso.valor, desconto);
            const compra = await IngressoCompra.create({
                usuarioId,
                ingressoId: ingresso.id,
                quantidade: qtd,
                valorUnitario,
                valorTotal: Number((valorUnitario * qtd).toFixed(2)),
                status: 'pendente',
            }, { transaction });

            return { compra, ingresso };
        });

        try {
            const result = await new Preference(client).create({
                body: montarPreference({
                    titulo: `Ingresso - ${ingresso.partida}`,
                    quantidade: qtd,
                    valorUnitario: compra.valorUnitario,
                    tipo: 'ingresso',
                    referencia: `${PREFIXO_REF_INGRESSO}${compra.id}`,
                }),
            });
            compra.mp_preference_id = result.id;
            await compra.save();
            res.json({ preferenceId: result.id });
        } catch (erroMp) {
            await compra.update({ status: 'cancelado' });
            throw erroMp;
        }
    } catch (erro) {
        responderErro(res, erro, 'Erro ao iniciar a compra do ingresso.');
    }
};

async function estornarAutomaticamente(pagamentoMp, motivo) {
    console.error(`Webhook: estornando pagamento ${pagamentoMp.id} — ${motivo}`);
    try {
        await new PaymentRefund(client).total({ payment_id: pagamentoMp.id });
        return true;
    } catch (erro) {
        console.error(`Webhook: falha ao estornar pagamento ${pagamentoMp.id}. Estorne manualmente no painel do Mercado Pago.`, erro);
        return false;
    }
}

async function estornarEMarcar(Modelo, id, pagamentoMp, motivo) {
    const estornou = await estornarAutomaticamente(pagamentoMp, motivo);
    if (!estornou) {
        await Modelo.update({ status: 'estorno_pendente' }, { where: { id } });
    }
}

async function tratarPagamentoRepetido(Modelo, id, pagamentoMp) {
    const registro = await Modelo.findByPk(id);
    if (registro && registro.status === 'aprovado' && String(registro.mp_payment_id) !== String(pagamentoMp.id)) {
        await estornarAutomaticamente(pagamentoMp, `segundo pagamento aprovado para a mesma cobrança (${Modelo.name} ${id})`);
    }
}

async function processarPagamentoPlano(pagamentoId, pagamentoMp) {
    const pagamento = await Pagamento.findByPk(pagamentoId);
    if (!pagamento) {
        console.error(`Webhook: pagamento de plano ${pagamentoId} não encontrado (MP ${pagamentoMp.id}).`);
        return;
    }

    const status = pagamentoMp.status;
    const mpPaymentId = String(pagamentoMp.id);

    if (status === 'approved') {
        if (!valorConfere(pagamentoMp, pagamento.valor)) {
            const [marcou] = await Pagamento.update(
                { status: 'valor_divergente', mp_payment_id: mpPaymentId },
                { where: { id: pagamento.id, status: { [Op.notIn]: STATUS_NAO_REAPROVAVEIS } } }
            );
            if (marcou) {
                await estornarEMarcar(Pagamento, pagamento.id, pagamentoMp, `valor pago (${pagamentoMp.transaction_amount}) diferente do plano (${pagamento.valor}) no pagamento ${pagamento.id}`);
            }
            return;
        }

        const plano = planoDoPagamento(pagamento);
        const aprovou = await sequelize.transaction(async (transaction) => {
            const [linhas] = await Pagamento.update(
                { status: 'aprovado', mp_payment_id: mpPaymentId, data_pagamento: new Date() },
                { where: { id: pagamento.id, status: { [Op.notIn]: STATUS_NAO_REAPROVAVEIS } }, transaction }
            );
            if (!linhas) return false;

            const socio = await SocioTorcedor.findByPk(pagamento.socioTorcedorId, { transaction, lock: transaction.LOCK.UPDATE });
            if (!socio) return true;

            const agora = new Date();
            const jaAtivo = socio.status === 'ativo';
            await socio.update({
                status: 'ativo',
                plano: plano ? plano.chave : socio.plano,
                dataAssociacao: jaAtivo ? socio.dataAssociacao : agora,
                validoAte: proximoVencimento(jaAtivo ? socio.validoAte : null, agora),
            }, { transaction });
            await marcarComoSocio(socio.usuarioId, transaction);
            return true;
        });

        if (!aprovou) {
            await tratarPagamentoRepetido(Pagamento, pagamento.id, pagamentoMp);
        }
        return;
    }

    if (STATUS_ESTORNO.includes(status)) {
        const estornou = await sequelize.transaction(async (transaction) => {
            const [linhas] = await Pagamento.update(
                { status },
                { where: { id: pagamento.id, status: 'aprovado', mp_payment_id: mpPaymentId }, transaction }
            );
            if (!linhas) return false;

            const socio = await SocioTorcedor.findByPk(pagamento.socioTorcedorId, { transaction, lock: transaction.LOCK.UPDATE });
            if (!socio) return true;

            const vigente = await Pagamento.findOne({
                where: { socioTorcedorId: socio.id, status: 'aprovado' },
                order: [['data_pagamento', 'DESC']],
                transaction,
            });
            const novoVencimento = vencimentoAnterior(socio.validoAte);
            if (!vigente || (novoVencimento && novoVencimento <= new Date())) {
                await socio.update({ status: 'inativo', validoAte: novoVencimento }, { transaction });
                await desmarcarComoSocio(socio.usuarioId, transaction);
            } else {
                const planoVigente = planoDoPagamento(vigente);
                await socio.update({ plano: planoVigente ? planoVigente.chave : socio.plano, validoAte: novoVencimento }, { transaction });
            }
            return true;
        });
        if (estornou) return;
    }

    await Pagamento.update(
        { status, mp_payment_id: mpPaymentId },
        { where: { id: pagamento.id, status: { [Op.notIn]: STATUS_NAO_SOBRESCREVIVEIS } } }
    );
}

async function enviarEmailIngresso(compra) {
    try {
        const [usuarioComprador, ingressoComprado] = await Promise.all([
            Usuario.findByPk(compra.usuarioId),
            Ingresso.findByPk(compra.ingressoId),
        ]);
        if (usuarioComprador && ingressoComprado) {
            await enviarIngressoPorEmail({ usuario: usuarioComprador, ingresso: ingressoComprado, compra });
        }
    } catch (erroEmail) {
        console.error('Erro ao enviar e-mail do ingresso:', erroEmail);
    }
}

async function processarPagamentoIngresso(compraId, pagamentoMp) {
    const compra = await IngressoCompra.findByPk(compraId);
    if (!compra) {
        console.error(`Webhook: compra de ingresso ${compraId} não encontrada (MP ${pagamentoMp.id}).`);
        return;
    }

    const status = pagamentoMp.status;
    const mpPaymentId = String(pagamentoMp.id);
    const quantidade = Number(compra.quantidade);

    if (status === 'approved') {
        if (!valorConfere(pagamentoMp, compra.valorTotal)) {
            const [marcou] = await IngressoCompra.update(
                { status: 'valor_divergente', mp_payment_id: mpPaymentId },
                { where: { id: compra.id, status: { [Op.notIn]: STATUS_NAO_REAPROVAVEIS } } }
            );
            if (marcou) {
                await estornarEMarcar(IngressoCompra, compra.id, pagamentoMp, `valor pago diferente do total da compra ${compra.id}`);
            }
            return;
        }

        const resultado = await sequelize.transaction(async (transaction) => {
            const [aprovou] = await IngressoCompra.update(
                { status: 'aprovado', mp_payment_id: mpPaymentId, hashQr: gerarHashQr() },
                { where: { id: compra.id, status: { [Op.notIn]: STATUS_NAO_REAPROVAVEIS } }, transaction }
            );
            if (!aprovou) return 'ja_processado';

            const [reservou] = await Ingresso.update(
                { quantidadeVendida: sequelize.literal(`quantidadeVendida + ${quantidade}`) },
                {
                    where: {
                        id: compra.ingressoId,
                        [Op.and]: [sequelize.literal(`quantidadeVendida + ${quantidade} <= quantidadeTotal`)],
                    },
                    transaction,
                }
            );
            if (!reservou) {
                await IngressoCompra.update({ status: 'sem_estoque', hashQr: null }, { where: { id: compra.id }, transaction });
                return 'sem_estoque';
            }
            return 'aprovado';
        });

        if (resultado === 'sem_estoque') {
            await estornarEMarcar(IngressoCompra, compra.id, pagamentoMp, `sem estoque para a compra ${compra.id}`);
        } else if (resultado === 'ja_processado') {
            await tratarPagamentoRepetido(IngressoCompra, compra.id, pagamentoMp);
        } else {
            await compra.reload();
            await enviarEmailIngresso(compra);
        }
        return;
    }

    if (STATUS_ESTORNO.includes(status)) {
        const estornou = await sequelize.transaction(async (transaction) => {
            const [linhas] = await IngressoCompra.update(
                { status, hashQr: null },
                { where: { id: compra.id, status: 'aprovado', mp_payment_id: mpPaymentId }, transaction }
            );
            if (!linhas) return false;
            await Ingresso.update(
                { quantidadeVendida: sequelize.literal(`quantidadeVendida - ${quantidade}`) },
                { where: { id: compra.ingressoId, quantidadeVendida: { [Op.gte]: quantidade } }, transaction }
            );
            return true;
        });
        if (estornou) return;
    }

    await IngressoCompra.update(
        { status, mp_payment_id: mpPaymentId },
        { where: { id: compra.id, status: { [Op.notIn]: STATUS_NAO_SOBRESCREVIVEIS } } }
    );
}

function assinaturaValida(req, dataId) {
    const segredo = process.env.MP_WEBHOOK_SECRET;
    if (!segredo) return true;
    try {
        WebhookSignatureValidator.validate({
            xSignature: req.headers['x-signature'],
            xRequestId: req.headers['x-request-id'],
            dataId,
            secret: segredo,
            toleranceSeconds: 300,
        });
        return true;
    } catch (erro) {
        console.error('Webhook: assinatura inválida —', erro.reason || erro.message);
        return false;
    }
}

exports.webhook = async (req, res) => {
    try {
        const tipo = req.query.type || req.query.topic || req.body?.type;
        const dataId = req.query['data.id'] || req.body?.data?.id;
        const paymentId = String(dataId || req.query.id || '');

        if (tipo !== 'payment' || !paymentId) {
            return res.sendStatus(200);
        }
        if (!/^\d+$/.test(paymentId)) {
            return res.sendStatus(400);
        }
        if (process.env.MP_WEBHOOK_SECRET && !dataId) {
            return res.sendStatus(200);
        }
        if (!assinaturaValida(req, String(dataId || ''))) {
            return res.sendStatus(401);
        }

        const pagamentoMp = await new Payment(client).get({ id: paymentId });
        const referencia = String(pagamentoMp.external_reference || '');
        if (pagamentoMp.status !== 'approved') {
            console.log(`Webhook: pagamento ${pagamentoMp.id} (${referencia}) com status ${pagamentoMp.status} — motivo: ${pagamentoMp.status_detail || 'não informado'}`);
        }

        const refPlano = referencia.match(REGEX_REF_PLANO);
        const refIngresso = referencia.match(REGEX_REF_INGRESSO);

        if (refIngresso) {
            await processarPagamentoIngresso(Number(refIngresso[1]), pagamentoMp);
        } else if (refPlano) {
            await processarPagamentoPlano(Number(refPlano[1]), pagamentoMp);
        } else {
            console.error(`Webhook: pagamento ${pagamentoMp.id} com external_reference desconhecido: "${referencia}".`);
        }

        res.sendStatus(200);
    } catch (erro) {
        console.error('Erro no webhook:', erro);
        res.sendStatus(500);
    }
};
