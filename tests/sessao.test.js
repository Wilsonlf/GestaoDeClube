process.env.JWT_SECRET = 'segredo-de-teste';

jest.mock('../src/models/Usuario', () => ({ findByPk: jest.fn() }));

const Usuario = require('../src/models/Usuario');
const { gerarToken } = require('../src/utils/sessao');
const { autenticarApi, identificarUsuario } = require('../src/middlewares/auth');
const { lerValorMonetario, lerInteiro, dataIsoValida, textoDaBusca } = require('../src/utils/entrada');

function resFalso() {
    const res = { statusCode: 200, locals: {} };
    res.status = jest.fn((codigo) => { res.statusCode = codigo; return res; });
    res.json = jest.fn(() => res);
    res.clearCookie = jest.fn();
    return res;
}

const usuarioBanco = { id: 1, nome: 'Ana', email: 'ana@x.com', tipo: 'comum', senha: 'hash-atual' };

describe('sessão', () => {
    test('token emitido com a senha atual é aceito', async () => {
        Usuario.findByPk.mockResolvedValue(usuarioBanco);
        const token = gerarToken(usuarioBanco);
        const next = jest.fn();
        await autenticarApi({ cookies: { token } }, resFalso(), next);
        expect(next).toHaveBeenCalled();
    });

    test('trocar a senha invalida o token antigo, inclusive nas páginas públicas', async () => {
        const tokenAntigo = gerarToken({ ...usuarioBanco, senha: 'hash-antigo' });
        Usuario.findByPk.mockResolvedValue(usuarioBanco);

        const resApi = resFalso();
        await autenticarApi({ cookies: { token: tokenAntigo } }, resApi, jest.fn());
        expect(resApi.statusCode).toBe(401);

        const req = { cookies: { token: tokenAntigo } };
        const resPagina = resFalso();
        const next = jest.fn();
        await identificarUsuario(req, resPagina, next);
        expect(next).toHaveBeenCalled();
        expect(req.usuario).toBeNull();
        expect(resPagina.locals.usuarioLogado).toBeNull();
        expect(resPagina.clearCookie).toHaveBeenCalledWith('token');
    });
});

describe('leitura de números e datas digitados', () => {
    test.each([
        ['1.500', 1500],
        ['1.500,50', 1500.5],
        ['19,90', 19.9],
        ['19.90', 19.9],
        ['R$ 30,00', 30],
        ['12.345.678,90', 12345678.9],
    ])('valor %p vira %p', (texto, esperado) => {
        expect(lerValorMonetario(texto)).toBe(esperado);
    });

    test.each(['abc', '', '-5', '1,2,3', '10.5.5'])('valor inválido %p vira NaN', (texto) => {
        expect(lerValorMonetario(texto)).toBeNaN();
    });

    test('quantidade com ponto de milhar e quantidade decimal', () => {
        expect(lerInteiro('1.000')).toBe(1000);
        expect(lerInteiro('2.5')).toBeNaN();
        expect(lerInteiro('abc')).toBeNaN();
    });

    test('datas inexistentes são recusadas', () => {
        expect(dataIsoValida('2026-02-30')).toBe(false);
        expect(dataIsoValida('2026-02-28')).toBe(true);
        expect(dataIsoValida('2028-02-29T10:00')).toBe(true);
    });

    test('busca repetida na URL não derruba a listagem', () => {
        expect(textoDaBusca(['a', 'b'])).toBe('a');
        expect(textoDaBusca(undefined)).toBe('');
    });
});
