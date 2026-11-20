jest.mock('../src/config/database', () => ({
    transaction: jest.fn(async (callback) => callback({ LOCK: { UPDATE: 'UPDATE' } })),
    literal: (sql) => ({ sql }),
}));
jest.mock('../src/config/mercadopago', () => ({}));
jest.mock('../src/utils/email', () => ({ enviarIngressoPorEmail: jest.fn() }));
jest.mock('../src/models/Pagamento', () => ({ findByPk: jest.fn(), findOne: jest.fn(), update: jest.fn(), create: jest.fn() }));
jest.mock('../src/models/Ingresso', () => ({ findByPk: jest.fn(), update: jest.fn() }));
jest.mock('../src/models/IngressoCompra', () => ({
    findByPk: jest.fn(), findOne: jest.fn(), update: jest.fn(), create: jest.fn(), sum: jest.fn(), count: jest.fn(), findAll: jest.fn(),
}));
jest.mock('../src/models/Usuario', () => ({ findByPk: jest.fn(), update: jest.fn() }));
jest.mock('../src/models/SocioTorcedor', () => ({ findByPk: jest.fn(), findOne: jest.fn(), create: jest.fn(), update: jest.fn() }));
jest.mock('../src/models/Index', () => ({
    Usuario: require('../src/models/Usuario'),
    SocioTorcedor: require('../src/models/SocioTorcedor'),
}));

const mockPaymentGet = jest.fn();
const mockRefund = jest.fn();
const mockPreferenceCreate = jest.fn();
jest.mock('mercadopago', () => ({
    Payment: jest.fn(() => ({ get: mockPaymentGet })),
    PaymentRefund: jest.fn(() => ({ total: mockRefund })),
    Preference: jest.fn(() => ({ create: mockPreferenceCreate })),
    WebhookSignatureValidator: { validate: jest.fn() },
}));

const { Op } = require('sequelize');
const Pagamento = require('../src/models/Pagamento');
const Ingresso = require('../src/models/Ingresso');
const IngressoCompra = require('../src/models/IngressoCompra');
const Usuario = require('../src/models/Usuario');
const SocioTorcedor = require('../src/models/SocioTorcedor');
const { enviarIngressoPorEmail } = require('../src/utils/email');
const { limparFalhas } = require('../src/utils/limiteLogin');
const pagamentoController = require('../src/controllers/pagamentoController');
const checagemController = require('../src/controllers/checagemController');

function resFalso() {
    const res = { statusCode: 200, body: undefined };
    res.status = jest.fn((codigo) => { res.statusCode = codigo; return res; });
    res.json = jest.fn((corpo) => { res.body = corpo; return res; });
    res.sendStatus = jest.fn((codigo) => { res.statusCode = codigo; return res; });
    return res;
}

function aviso(id) {
    return { query: { type: 'payment', 'data.id': String(id) }, body: {}, headers: {} };
}

function pagamentoMp(id, extra) {
    return { id, status: 'approved', transaction_amount: 50, currency_id: 'BRL', external_reference: 'ingresso_compra_5', ...extra };
}

function compraFalsa(extra = {}) {
    return { id: 5, usuarioId: 3, ingressoId: 1, quantidade: 2, valorTotal: 50, status: 'pendente', reload: jest.fn(), update: jest.fn(), save: jest.fn(), ...extra };
}

function chamadaUpdate(modelo, indice) {
    const [valores, opcoes] = modelo.update.mock.calls[indice];
    return { valores, where: opcoes.where };
}

beforeEach(() => {
    jest.clearAllMocks();
    Usuario.findByPk.mockResolvedValue({ id: 3, nome: 'Torcedor', email: 't@t.com' });
    Ingresso.findByPk.mockResolvedValue({ id: 1, partida: 'Águia x Rival' });
    limparFalhas('pedido-pagamento|3');
});

describe('webhook de ingresso', () => {
    test('aprovação usa UPDATE condicional e incremento limitado ao total', async () => {
        mockPaymentGet.mockResolvedValue(pagamentoMp(123));
        IngressoCompra.findByPk.mockResolvedValue(compraFalsa());
        IngressoCompra.update.mockResolvedValue([1]);
        Ingresso.update.mockResolvedValue([1]);

        await pagamentoController.webhook(aviso(123), resFalso());

        const aprovacao = chamadaUpdate(IngressoCompra, 0);
        expect(aprovacao.valores.status).toBe('aprovado');
        expect(aprovacao.where.id).toBe(5);
        expect(aprovacao.where.status[Op.notIn]).toEqual(expect.arrayContaining(['aprovado', 'sem_estoque']));

        const estoque = chamadaUpdate(Ingresso, 0);
        expect(estoque.valores.quantidadeVendida.sql).toBe('quantidadeVendida + 2');
        expect(estoque.where[Op.and][0].sql).toBe('quantidadeVendida + 2 <= quantidadeTotal');
        expect(enviarIngressoPorEmail).toHaveBeenCalledTimes(1);
    });

    test('aviso repetido do mesmo pagamento não incrementa nem estorna', async () => {
        mockPaymentGet.mockResolvedValue(pagamentoMp(123));
        IngressoCompra.findByPk
            .mockResolvedValueOnce(compraFalsa())
            .mockResolvedValueOnce(compraFalsa({ status: 'aprovado', mp_payment_id: '123' }));
        IngressoCompra.update.mockResolvedValue([0]);

        await pagamentoController.webhook(aviso(123), resFalso());

        expect(Ingresso.update).not.toHaveBeenCalled();
        expect(mockRefund).not.toHaveBeenCalled();
        expect(enviarIngressoPorEmail).not.toHaveBeenCalled();
    });

    test('segundo pagamento aprovado da mesma compra é estornado', async () => {
        mockPaymentGet.mockResolvedValue(pagamentoMp(999));
        IngressoCompra.findByPk
            .mockResolvedValueOnce(compraFalsa())
            .mockResolvedValueOnce(compraFalsa({ status: 'aprovado', mp_payment_id: '123' }));
        IngressoCompra.update.mockResolvedValue([0]);

        await pagamentoController.webhook(aviso(999), resFalso());

        expect(mockRefund).toHaveBeenCalledWith({ payment_id: 999 });
        expect(Ingresso.update).not.toHaveBeenCalled();
    });

    test('sem estoque na aprovação: marca sem_estoque e estorna', async () => {
        mockPaymentGet.mockResolvedValue(pagamentoMp(124));
        IngressoCompra.findByPk.mockResolvedValue(compraFalsa());
        IngressoCompra.update.mockResolvedValue([1]);
        Ingresso.update.mockResolvedValue([0]);

        await pagamentoController.webhook(aviso(124), resFalso());

        expect(chamadaUpdate(IngressoCompra, 1).valores).toEqual({ status: 'sem_estoque', hashQr: null });
        expect(mockRefund).toHaveBeenCalledWith({ payment_id: 124 });
        expect(enviarIngressoPorEmail).not.toHaveBeenCalled();
    });

    test('estorno que falha deixa a compra marcada como estorno_pendente', async () => {
        mockPaymentGet.mockResolvedValue(pagamentoMp(125, { transaction_amount: 1 }));
        IngressoCompra.findByPk.mockResolvedValue(compraFalsa());
        IngressoCompra.update.mockResolvedValue([1]);
        mockRefund.mockRejectedValueOnce(new Error('MP fora do ar'));

        await pagamentoController.webhook(aviso(125), resFalso());

        expect(chamadaUpdate(IngressoCompra, 0).valores.status).toBe('valor_divergente');
        expect(chamadaUpdate(IngressoCompra, 1).valores).toEqual({ status: 'estorno_pendente' });
        expect(Ingresso.update).not.toHaveBeenCalled();
    });

    test('estorno só vale para o pagamento que aprovou a compra e devolve o estoque', async () => {
        mockPaymentGet.mockResolvedValue(pagamentoMp(126, { status: 'refunded' }));
        IngressoCompra.findByPk.mockResolvedValue(compraFalsa({ status: 'aprovado' }));
        IngressoCompra.update.mockResolvedValue([1]);
        Ingresso.update.mockResolvedValue([1]);

        await pagamentoController.webhook(aviso(126), resFalso());

        const estorno = chamadaUpdate(IngressoCompra, 0);
        expect(estorno.valores).toMatchObject({ status: 'refunded', hashQr: null });
        expect(estorno.where).toEqual({ id: 5, status: 'aprovado', mp_payment_id: '126' });
        expect(chamadaUpdate(Ingresso, 0).valores.quantidadeVendida.sql).toBe('quantidadeVendida - 2');
    });

    test('status não aprovado nunca sobrescreve aprovado', async () => {
        mockPaymentGet.mockResolvedValue(pagamentoMp(127, { status: 'rejected' }));
        IngressoCompra.findByPk.mockResolvedValue(compraFalsa({ status: 'aprovado' }));
        IngressoCompra.update.mockResolvedValue([0]);

        await pagamentoController.webhook(aviso(127), resFalso());

        expect(chamadaUpdate(IngressoCompra, 0).where.status[Op.notIn]).toEqual(expect.arrayContaining(['aprovado', 'refunded']));
    });
});

describe('webhook de plano (30 dias por pagamento)', () => {
    const DIA = 86400000;
    const pagamentoVoo = () => ({ id: 9, socioTorcedorId: 4, valor: 79.9, descricao: 'Sócio Torcedor - Voo Supremo' });
    const socioFalso = (extra = {}) => ({ id: 4, usuarioId: 3, plano: 'ninho', status: 'pendente', validoAte: null, update: jest.fn(), ...extra });

    test('primeiro pagamento aprovado ativa o sócio com o plano pago e 30 dias de validade', async () => {
        mockPaymentGet.mockResolvedValue(pagamentoMp(200, { external_reference: 'pagamento_9', transaction_amount: 79.9 }));
        Pagamento.findByPk.mockResolvedValue(pagamentoVoo());
        Pagamento.update.mockResolvedValue([1]);
        const socio = socioFalso();
        SocioTorcedor.findByPk.mockResolvedValue(socio);

        await pagamentoController.webhook(aviso(200), resFalso());

        expect(Pagamento.findByPk).toHaveBeenCalledWith(9);
        expect(chamadaUpdate(Pagamento, 0).where.status[Op.notIn]).toContain('aprovado');
        const [valores] = socio.update.mock.calls[0];
        expect(valores).toMatchObject({ status: 'ativo', plano: 'voo_supremo' });
        expect(Math.round((valores.validoAte - Date.now()) / DIA)).toBe(30);
        expect(Usuario.update).toHaveBeenCalledWith({ tipo: 'socio' }, expect.objectContaining({ where: { id: 3, tipo: 'comum' } }));
    });

    test('pagar de novo com o plano ativo é renovação: soma 30 dias ao vencimento atual e não estorna', async () => {
        const vencimentoAtual = new Date(Date.now() + 10 * DIA);
        mockPaymentGet.mockResolvedValue(pagamentoMp(201, { external_reference: 'pagamento_9', transaction_amount: 79.9 }));
        Pagamento.findByPk.mockResolvedValue(pagamentoVoo());
        Pagamento.update.mockResolvedValue([1]);
        const socio = socioFalso({ status: 'ativo', plano: 'voo_supremo', validoAte: vencimentoAtual, dataAssociacao: new Date('2026-01-01') });
        SocioTorcedor.findByPk.mockResolvedValue(socio);

        await pagamentoController.webhook(aviso(201), resFalso());

        const [valores] = socio.update.mock.calls[0];
        expect(valores.validoAte.getTime() - vencimentoAtual.getTime()).toBe(30 * DIA);
        expect(valores.dataAssociacao).toEqual(new Date('2026-01-01'));
        expect(mockRefund).not.toHaveBeenCalled();
    });

    test('sócio vencido que paga de novo recomeça 30 dias a partir de hoje', async () => {
        mockPaymentGet.mockResolvedValue(pagamentoMp(204, { external_reference: 'pagamento_9', transaction_amount: 79.9 }));
        Pagamento.findByPk.mockResolvedValue(pagamentoVoo());
        Pagamento.update.mockResolvedValue([1]);
        const socio = socioFalso({ status: 'inativo', validoAte: new Date(Date.now() - 5 * DIA) });
        SocioTorcedor.findByPk.mockResolvedValue(socio);

        await pagamentoController.webhook(aviso(204), resFalso());

        const [valores] = socio.update.mock.calls[0];
        expect(Math.round((valores.validoAte - Date.now()) / DIA)).toBe(30);
    });

    test('aviso repetido do mesmo pagamento não soma dias nem estorna', async () => {
        mockPaymentGet.mockResolvedValue(pagamentoMp(205, { external_reference: 'pagamento_9', transaction_amount: 79.9 }));
        Pagamento.findByPk
            .mockResolvedValueOnce(pagamentoVoo())
            .mockResolvedValueOnce({ ...pagamentoVoo(), status: 'aprovado', mp_payment_id: '205' });
        Pagamento.update.mockResolvedValue([0]);

        await pagamentoController.webhook(aviso(205), resFalso());

        expect(SocioTorcedor.findByPk).not.toHaveBeenCalled();
        expect(mockRefund).not.toHaveBeenCalled();
    });

    test('estorno com outro pagamento aprovado mantém o sócio e devolve os 30 dias', async () => {
        const validoAte = new Date(Date.now() + 45 * DIA);
        mockPaymentGet.mockResolvedValue(pagamentoMp(202, { status: 'refunded', external_reference: 'pagamento_7', transaction_amount: 19.9 }));
        Pagamento.findByPk.mockResolvedValue({ id: 7, socioTorcedorId: 4, valor: 19.9, descricao: 'Sócio Torcedor - Ninho' });
        Pagamento.update.mockResolvedValue([1]);
        Pagamento.findOne.mockResolvedValue(pagamentoVoo());
        const socio = socioFalso({ status: 'ativo', plano: 'voo_supremo', validoAte });
        SocioTorcedor.findByPk.mockResolvedValue(socio);

        await pagamentoController.webhook(aviso(202), resFalso());

        expect(chamadaUpdate(Pagamento, 0).where).toEqual({ id: 7, status: 'aprovado', mp_payment_id: '202' });
        const [valores] = socio.update.mock.calls[0];
        expect(valores.plano).toBe('voo_supremo');
        expect(validoAte.getTime() - valores.validoAte.getTime()).toBe(30 * DIA);
        expect(valores.status).toBeUndefined();
        expect(Usuario.update).not.toHaveBeenCalled();
    });

    test('estorno do único plano pago inativa o sócio', async () => {
        mockPaymentGet.mockResolvedValue(pagamentoMp(203, { status: 'charged_back', external_reference: 'pagamento_9', transaction_amount: 79.9 }));
        Pagamento.findByPk.mockResolvedValue(pagamentoVoo());
        Pagamento.update.mockResolvedValue([1]);
        Pagamento.findOne.mockResolvedValue(null);
        const socio = socioFalso({ status: 'ativo', plano: 'voo_supremo', validoAte: new Date(Date.now() + 20 * DIA) });
        SocioTorcedor.findByPk.mockResolvedValue(socio);

        await pagamentoController.webhook(aviso(203), resFalso());

        expect(socio.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'inativo' }), expect.anything());
        expect(Usuario.update).toHaveBeenCalledWith({ tipo: 'comum' }, expect.objectContaining({ where: { id: 3, tipo: 'socio' } }));
    });

    test('valor pago menor que o plano é estornado e não ativa o sócio', async () => {
        mockPaymentGet.mockResolvedValue(pagamentoMp(206, { external_reference: 'pagamento_9', transaction_amount: 1 }));
        Pagamento.findByPk.mockResolvedValue(pagamentoVoo());
        Pagamento.update.mockResolvedValue([1]);

        await pagamentoController.webhook(aviso(206), resFalso());

        expect(chamadaUpdate(Pagamento, 0).valores.status).toBe('valor_divergente');
        expect(mockRefund).toHaveBeenCalledWith({ payment_id: 206 });
        expect(SocioTorcedor.findByPk).not.toHaveBeenCalled();
    });
});

describe('criar pagamento de plano', () => {
    const req = (plano) => ({ body: { plano }, usuario: { id: 3, email: 't@t.com' } });

    test('cria checkout (preferência) igual ao do ingresso, com referência do plano', async () => {
        SocioTorcedor.findOne.mockResolvedValue({ id: 4, status: 'pendente' });
        Pagamento.findOne.mockResolvedValue(null);
        const pagamento = { id: 9, save: jest.fn(), update: jest.fn() };
        Pagamento.create.mockResolvedValue(pagamento);
        mockPreferenceCreate.mockResolvedValue({ id: 'pref1' });
        const res = resFalso();

        await pagamentoController.criarPagamento(req('asas_negras'), res);

        const { body } = mockPreferenceCreate.mock.calls[0][0];
        expect(body.external_reference).toBe('pagamento_9');
        expect(body.items[0]).toMatchObject({ unit_price: 39.9, quantity: 1 });
        expect(body.items[0].title).toMatch(/30 dias/);
        expect(res.body).toEqual({ preferenceId: 'pref1' });
    });

    test('sócio ativo pode pagar o mesmo plano de novo (renovação)', async () => {
        SocioTorcedor.findOne.mockResolvedValue({ id: 4, status: 'ativo', plano: 'asas_negras' });
        Pagamento.findOne.mockResolvedValue(null);
        Pagamento.create.mockResolvedValue({ id: 10, save: jest.fn(), update: jest.fn() });
        mockPreferenceCreate.mockResolvedValue({ id: 'pref2' });
        const res = resFalso();

        await pagamentoController.criarPagamento(req('asas_negras'), res);

        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({ preferenceId: 'pref2' });
    });

    test('plano inválido é recusado sem chamar o Mercado Pago', async () => {
        const res = resFalso();

        await pagamentoController.criarPagamento(req('plano_inexistente'), res);

        expect(res.statusCode).toBe(400);
        expect(mockPreferenceCreate).not.toHaveBeenCalled();
    });
});

describe('criar compra de ingresso', () => {
    const req = (quantidade) => ({ body: { ingressoId: 1, quantidade }, usuario: { id: 3 } });
    const partidaFutura = (extra) => ({ id: 1, status: 'ativo', valor: 50, quantidadeTotal: 10, quantidadeVendida: 4, dataPartida: new Date(Date.now() + 86400000), ...extra });

    test.each([0, '0', 'abc', 2.5, -3, 11])('quantidade %p é recusada', async (quantidade) => {
        const res = resFalso();
        await pagamentoController.criarPagamentoIngresso(req(quantidade), res);
        expect(res.statusCode).toBe(400);
        expect(IngressoCompra.create).not.toHaveBeenCalled();
    });

    test('compras pendentes reservam estoque (sem overselling)', async () => {
        SocioTorcedor.findOne.mockResolvedValue(null);
        Ingresso.findByPk.mockResolvedValue(partidaFutura());
        IngressoCompra.update.mockResolvedValue([0]);
        IngressoCompra.count.mockResolvedValue(0);
        IngressoCompra.sum.mockResolvedValue(6);

        const res = resFalso();
        await pagamentoController.criarPagamentoIngresso(req(1), res);

        expect(res.statusCode).toBe(400);
        expect(res.body.erro).toMatch(/esgotados/);
        expect(IngressoCompra.create).not.toHaveBeenCalled();
    });

    test('usuário com reservas demais não consegue travar mais estoque', async () => {
        SocioTorcedor.findOne.mockResolvedValue(null);
        Ingresso.findByPk.mockResolvedValue(partidaFutura());
        IngressoCompra.update.mockResolvedValue([0]);
        IngressoCompra.count.mockResolvedValue(2);

        const res = resFalso();
        await pagamentoController.criarPagamentoIngresso(req(1), res);

        expect(res.statusCode).toBe(429);
        expect(IngressoCompra.create).not.toHaveBeenCalled();
    });

    test('nova tentativa cancela a reserva anterior do mesmo usuário na mesma partida', async () => {
        SocioTorcedor.findOne.mockResolvedValue(null);
        Ingresso.findByPk.mockResolvedValue(partidaFutura());
        IngressoCompra.update.mockResolvedValue([1]);
        IngressoCompra.count.mockResolvedValue(0);
        IngressoCompra.sum.mockResolvedValue(0);
        IngressoCompra.create.mockResolvedValue(compraFalsa({ valorUnitario: 50 }));
        mockPreferenceCreate.mockResolvedValue({ id: 'pref-1' });

        const res = resFalso();
        await pagamentoController.criarPagamentoIngresso(req(1), res);

        expect(chamadaUpdate(IngressoCompra, 0)).toMatchObject({ valores: { status: 'cancelado' }, where: { usuarioId: 3, ingressoId: 1, status: 'pendente' } });
        expect(res.body).toEqual({ preferenceId: 'pref-1' });
        const preferencia = mockPreferenceCreate.mock.calls[0][0].body;
        expect(preferencia.external_reference).toBe('ingresso_compra_5');
        expect(preferencia.payment_methods.excluded_payment_types).toEqual([{ id: 'ticket' }, { id: 'atm' }]);
    });

    test('muitas tentativas de pagamento seguidas são bloqueadas', async () => {
        SocioTorcedor.findOne.mockResolvedValue(null);
        Ingresso.findByPk.mockResolvedValue(partidaFutura({ status: 'encerrado' }));
        const respostas = [];
        for (let i = 0; i < 11; i++) {
            const res = resFalso();
            await pagamentoController.criarPagamentoIngresso(req(1), res);
            respostas.push(res.statusCode);
        }
        expect(respostas.slice(0, 10).every((s) => s === 404)).toBe(true);
        expect(respostas[10]).toBe(429);
    });
});

describe('checagem na portaria', () => {
    const compraAprovada = (extra = {}) => ({
        id: 7, status: 'aprovado', statusCheckin: 'pendente', quantidade: 1,
        Usuario: { nome: '<img src=x>', cpf: '52998224725' },
        Ingresso: { partida: 'Águia x Rival', local: 'Ninho', dataPartida: new Date() },
        reload: jest.fn(),
        ...extra,
    });

    test('check-in só grava se ainda estiver pendente (dois portões não liberam o mesmo QR)', async () => {
        IngressoCompra.findOne.mockResolvedValue(compraAprovada());
        IngressoCompra.update.mockResolvedValueOnce([1]).mockResolvedValueOnce([0]);

        const req = { body: { hash: 'abc' }, usuario: { id: 1 } };
        const [r1, r2] = [resFalso(), resFalso()];
        await Promise.all([checagemController.validarPorHash(req, r1), checagemController.validarPorHash(req, r2)]);

        expect([r1.statusCode, r2.statusCode].sort()).toEqual([200, 409]);
        expect(chamadaUpdate(IngressoCompra, 0).where).toEqual({ id: 7, status: 'aprovado', statusCheckin: 'pendente' });
    });

    test('ingresso de outra partida não entra', async () => {
        IngressoCompra.findOne.mockResolvedValue(compraAprovada({
            Ingresso: { partida: 'Outro jogo', local: 'Ninho', dataPartida: new Date(Date.now() + 7 * 86400000) },
        }));

        const res = resFalso();
        await checagemController.validarPorHash({ body: { hash: 'abc' }, usuario: { id: 1 } }, res);

        expect(res.statusCode).toBe(400);
        expect(res.body.ingresso.entradaLiberadaAgora).toBe(false);
        expect(IngressoCompra.update).not.toHaveBeenCalled();
    });

    test('confirmação manual exige o CPF dono da compra', async () => {
        IngressoCompra.findByPk.mockResolvedValue(compraAprovada());
        const res = resFalso();
        await checagemController.validarManual({ body: { compraId: 7, cpf: '11144477735' }, usuario: { id: 1 } }, res);
        expect(res.statusCode).toBe(404);
    });

    test('hash que não é texto é recusado', async () => {
        const res = resFalso();
        await checagemController.validarPorHash({ body: { hash: { $ne: null } }, usuario: { id: 1 } }, res);
        expect(res.statusCode).toBe(400);
        expect(IngressoCompra.findOne).not.toHaveBeenCalled();
    });
});
