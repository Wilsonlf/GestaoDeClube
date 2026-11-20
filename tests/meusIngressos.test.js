jest.mock('../src/models/Ingresso', () => ({}));
jest.mock('../src/models/IngressoCompra', () => ({ findAll: jest.fn() }));
jest.mock('../src/models/Usuario', () => ({}));
jest.mock('qrcode', () => ({ toDataURL: jest.fn(async (hash) => `data:image/png;base64,QR-${hash}`) }));

const { Op } = require('sequelize');
const QRCode = require('qrcode');
const IngressoCompra = require('../src/models/IngressoCompra');
const { listarMeusIngressos } = require('../src/controllers/ingressoController');

const HORA = 3600000;

function resFalso() {
    const res = { headers: {} };
    res.set = jest.fn((nome, valor) => { res.headers[nome] = valor; return res; });
    res.render = jest.fn((view, dados) => { res.view = view; res.dados = dados; });
    res.status = jest.fn(() => res);
    res.send = jest.fn();
    return res;
}

function compra(id, extra = {}, partidaExtra = {}) {
    return {
        id,
        quantidade: 2,
        status: 'aprovado',
        hashQr: `hash${id}`,
        statusCheckin: 'pendente',
        Ingresso: { partida: `Jogo ${id}`, competicao: 'Estadual', local: 'Ninho da Águia', dataPartida: new Date(Date.now() + 48 * HORA), ...partidaExtra },
        ...extra,
    };
}

beforeEach(() => jest.clearAllMocks());

describe('Meus ingressos', () => {
    test('busca só as compras do usuário logado e não deixa a página em cache', async () => {
        IngressoCompra.findAll.mockResolvedValue([]);
        const res = resFalso();

        await listarMeusIngressos({ usuario: { id: 7 } }, res);

        const where = IngressoCompra.findAll.mock.calls[0][0].where;
        expect(where.usuarioId).toBe(7);
        expect(where.status[Op.in]).toEqual(expect.arrayContaining(['aprovado', 'pendente']));
        expect(where.status[Op.in]).not.toContain('refunded');
        expect(res.headers['Cache-Control']).toBe('no-store');
        expect(res.view).toBe('meus-ingressos');
    });

    test('mostra QR só de compra paga, não utilizada e de partida que não acabou', async () => {
        IngressoCompra.findAll.mockResolvedValue([
            compra(1),
            compra(2, { statusCheckin: 'utilizado' }),
            compra(3, { status: 'pendente', hashQr: null }),
            compra(4, {}, { dataPartida: new Date(Date.now() - 10 * HORA) }),
        ]);
        const res = resFalso();

        await listarMeusIngressos({ usuario: { id: 7 } }, res);

        const { proximos, anteriores } = res.dados;
        const porId = Object.fromEntries(proximos.map((i) => [i.id, i]));
        expect(porId[1].qr).toBe('data:image/png;base64,QR-hash1');
        expect(porId[2].qr).toBeNull();
        expect(porId[2].utilizado).toBe(true);
        expect(porId[3].qr).toBeNull();
        expect(porId[3].rotuloStatus).toBe('Aguardando pagamento');
        expect(anteriores.map((i) => i.id)).toEqual([4]);
        expect(anteriores[0].qr).toBeNull();
        expect(QRCode.toDataURL).toHaveBeenCalledTimes(1);
    });

    test('partida em andamento (até 6h após o início) ainda mostra o QR', async () => {
        IngressoCompra.findAll.mockResolvedValue([compra(5, {}, { dataPartida: new Date(Date.now() - 2 * HORA) })]);
        const res = resFalso();

        await listarMeusIngressos({ usuario: { id: 7 } }, res);

        expect(res.dados.proximos[0].qr).toBeTruthy();
    });

    test('próximas partidas em ordem de data e pendentes de partidas antigas não aparecem', async () => {
        IngressoCompra.findAll.mockResolvedValue([
            compra(6, {}, { dataPartida: new Date(Date.now() + 96 * HORA) }),
            compra(7, {}, { dataPartida: new Date(Date.now() + 24 * HORA) }),
            compra(8, { status: 'pendente', hashQr: null }, { dataPartida: new Date(Date.now() - 48 * HORA) }),
        ]);
        const res = resFalso();

        await listarMeusIngressos({ usuario: { id: 7 } }, res);

        expect(res.dados.proximos.map((i) => i.id)).toEqual([7, 6]);
        expect(res.dados.anteriores).toEqual([]);
    });
});
