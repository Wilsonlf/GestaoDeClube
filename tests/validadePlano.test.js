jest.mock('../src/config/ambiente', () => ({ APP_URL: 'https://clube.exemplo' }));
jest.mock('../src/models/Index', () => ({
    Usuario: {},
    SocioTorcedor: { findAll: jest.fn(), update: jest.fn() },
}));
jest.mock('../src/utils/tipoUsuario', () => ({ desmarcarComoSocio: jest.fn() }));
jest.mock('../src/utils/email', () => ({ enviarLembreteVencimento: jest.fn() }));

const { Op } = require('sequelize');
const { SocioTorcedor } = require('../src/models/Index');
const { desmarcarComoSocio } = require('../src/utils/tipoUsuario');
const { enviarLembreteVencimento } = require('../src/utils/email');
const { proximoVencimento, vencimentoAnterior, DIAS_VALIDADE_PLANO, DIAS_AVISO_VENCIMENTO } = require('../src/utils/validadePlano');
const { inativarSociosVencidos, enviarLembretesDeVencimento } = require('../src/utils/vencimentoSocios');

const DIA = 86400000;

beforeEach(() => jest.clearAllMocks());

describe('datas de validade do plano', () => {
    test('cada pagamento vale 30 dias', () => {
        expect(DIAS_VALIDADE_PLANO).toBe(30);
    });

    test('renovação antes de vencer soma 30 dias ao vencimento atual (não perde dias)', () => {
        const agora = new Date('2026-06-10T12:00:00Z');
        const vencimento = new Date('2026-06-20T12:00:00Z');
        expect(proximoVencimento(vencimento, agora)).toEqual(new Date('2026-07-20T12:00:00Z'));
    });

    test('plano vencido ou sem data recomeça 30 dias a partir de agora', () => {
        const agora = new Date('2026-06-10T12:00:00Z');
        expect(proximoVencimento(new Date('2026-05-01T12:00:00Z'), agora)).toEqual(new Date('2026-07-10T12:00:00Z'));
        expect(proximoVencimento(null, agora)).toEqual(new Date('2026-07-10T12:00:00Z'));
    });

    test('estorno devolve 30 dias; sem data continua sem data', () => {
        expect(vencimentoAnterior(new Date('2026-07-20T12:00:00Z'))).toEqual(new Date('2026-06-20T12:00:00Z'));
        expect(vencimentoAnterior(null)).toBeNull();
    });
});

describe('inativarSociosVencidos', () => {
    test('inativa ativos com validade passada usando UPDATE condicional e rebaixa o usuário', async () => {
        SocioTorcedor.findAll.mockResolvedValue([{ id: 4, usuarioId: 3, validoAte: new Date('2026-01-01') }]);
        SocioTorcedor.update.mockResolvedValue([1]);

        await inativarSociosVencidos();

        const where = SocioTorcedor.findAll.mock.calls[0][0].where;
        expect(where.status).toBe('ativo');
        expect(Math.abs(where.validoAte[Op.lt] - Date.now())).toBeLessThan(5000);

        const [valores, opcoes] = SocioTorcedor.update.mock.calls[0];
        expect(valores).toEqual({ status: 'inativo' });
        expect(opcoes.where).toMatchObject({ id: 4, status: 'ativo' });
        expect(desmarcarComoSocio).toHaveBeenCalledWith(3);
    });

    test('se uma renovação chegou no meio (UPDATE não alterou nada), não rebaixa o usuário', async () => {
        SocioTorcedor.findAll.mockResolvedValue([{ id: 4, usuarioId: 3, validoAte: new Date('2026-01-01') }]);
        SocioTorcedor.update.mockResolvedValue([0]);

        await inativarSociosVencidos();

        expect(desmarcarComoSocio).not.toHaveBeenCalled();
    });
});

describe('enviarLembretesDeVencimento', () => {
    const socioAVencer = (extra = {}) => ({
        id: 4,
        plano: 'asas_negras',
        validoAte: new Date(Date.now() + 2 * DIA),
        lembreteEnviadoPara: null,
        Usuario: { id: 3, nome: 'Torcedor', email: 't@t.com' },
        ...extra,
    });

    test('busca ativos que vencem nos próximos dias e envia o lembrete com link para renovar', async () => {
        const socio = socioAVencer();
        SocioTorcedor.findAll.mockResolvedValue([socio]);
        SocioTorcedor.update.mockResolvedValue([1]);

        await enviarLembretesDeVencimento();

        const where = SocioTorcedor.findAll.mock.calls[0][0].where;
        expect(where.status).toBe('ativo');
        expect(Math.round((where.validoAte[Op.lte] - Date.now()) / DIA)).toBe(DIAS_AVISO_VENCIMENTO);

        expect(SocioTorcedor.update).toHaveBeenCalledWith(
            { lembreteEnviadoPara: socio.validoAte },
            { where: { id: 4, validoAte: socio.validoAte } }
        );
        expect(enviarLembreteVencimento).toHaveBeenCalledWith({
            usuario: socio.Usuario,
            nomePlano: 'Asas Negras',
            validoAte: socio.validoAte,
            link: 'https://clube.exemplo/planos',
        });
    });

    test('não manda de novo o lembrete do mesmo vencimento', async () => {
        const validoAte = new Date(Date.now() + DIA);
        SocioTorcedor.findAll.mockResolvedValue([socioAVencer({ validoAte, lembreteEnviadoPara: new Date(validoAte) })]);

        await enviarLembretesDeVencimento();

        expect(SocioTorcedor.update).not.toHaveBeenCalled();
        expect(enviarLembreteVencimento).not.toHaveBeenCalled();
    });

    test('depois de renovar (vencimento novo) o lembrete volta a ser enviado', async () => {
        const vencimentoAntigo = new Date(Date.now() - 28 * DIA);
        SocioTorcedor.findAll.mockResolvedValue([socioAVencer({ lembreteEnviadoPara: vencimentoAntigo })]);
        SocioTorcedor.update.mockResolvedValue([1]);

        await enviarLembretesDeVencimento();

        expect(enviarLembreteVencimento).toHaveBeenCalledTimes(1);
    });

    test('se outro processo já marcou o lembrete, não envia (sem e-mail duplicado)', async () => {
        SocioTorcedor.findAll.mockResolvedValue([socioAVencer()]);
        SocioTorcedor.update.mockResolvedValue([0]);

        await enviarLembretesDeVencimento();

        expect(enviarLembreteVencimento).not.toHaveBeenCalled();
    });

    test('falha no envio do e-mail é só registrada no log', async () => {
        SocioTorcedor.findAll.mockResolvedValue([socioAVencer()]);
        SocioTorcedor.update.mockResolvedValue([1]);
        enviarLembreteVencimento.mockRejectedValueOnce(new Error('SMTP fora do ar'));
        jest.spyOn(console, 'error').mockImplementation(() => {});

        await expect(enviarLembretesDeVencimento()).resolves.toBeUndefined();

        expect(console.error).toHaveBeenCalled();
        console.error.mockRestore();
    });
});
