const { validarCadastro, validarSenha, cpfValido } = require('../src/utils/validacaoCadastro');
const { normalizarPlano, obterDescontoIngresso, aplicarDesconto } = require('../src/utils/socioDesconto');
const { obterPlano } = require('../src/config/planos');

const cadastroValido = {
    nome: 'Torcedor Teste',
    email: 'Torcedor@Email.com',
    senha: 'senha1234',
    cpf: '529.982.247-25',
    telefone: '(67) 99999-0000',
};

describe('validação de cadastro', () => {
    test('aceita dados válidos e normaliza e-mail, CPF e telefone', () => {
        const { erro, dados } = validarCadastro(cadastroValido);
        expect(erro).toBeUndefined();
        expect(dados.email).toBe('torcedor@email.com');
        expect(dados.cpf).toBe('52998224725');
        expect(dados.telefone).toBe('(67) 99999-0000');
    });

    test('recusa CPF com dígito verificador errado ou repetido', () => {
        expect(cpfValido('52998224724')).toBe(false);
        expect(cpfValido('11111111111')).toBe(false);
        expect(cpfValido('52998224725')).toBe(true);
    });

    test('recusa e-mail com pontos seguidos no domínio', () => {
        expect(validarCadastro({ ...cadastroValido, email: 'a@b..com' }).erro).toBe('Informe um e-mail válido.');
    });

    test('recusa telefone com letras', () => {
        expect(validarCadastro({ ...cadastroValido, telefone: 'abc67999990000' }).erro).toMatch(/Telefone inválido/);
    });

    test('senha precisa de letras e números e cabe em 72 bytes', () => {
        expect(validarSenha('curta1')).not.toBeNull();
        expect(validarSenha('somenteletras')).not.toBeNull();
        expect(validarSenha('senha1234')).toBeNull();
        expect(validarSenha('ã'.repeat(40) + '1')).not.toBeNull();
    });
});

describe('planos e desconto', () => {
    test('normaliza os formatos antigos do plano', () => {
        expect(normalizarPlano('Asas Negras')).toBe('asas_negras');
        expect(normalizarPlano('Voo Supremo')).toBe('voo_supremo');
        expect(normalizarPlano('ninho')).toBe('ninho');
    });

    test('desconto bate com a configuração dos planos', () => {
        expect(obterDescontoIngresso('Ninho')).toBe(0.10);
        expect(obterDescontoIngresso('asas_negras')).toBe(0.20);
        expect(obterDescontoIngresso('Voo Supremo')).toBe(0.30);
    });

    test('chave herdada do prototype não é plano', () => {
        expect(obterPlano('constructor')).toBeNull();
        expect(obterDescontoIngresso('constructor')).toBe(0);
        expect(obterDescontoIngresso('toString')).toBe(0);
    });

    test('aplica desconto com duas casas', () => {
        expect(aplicarDesconto(50, 0.3)).toBe(35);
        expect(aplicarDesconto(19.9, 0.1)).toBe(17.91);
    });
});
