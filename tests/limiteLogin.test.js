const { minutosBloqueado, registrarFalha, limparFalhas, MAX_TENTATIVAS } = require('../src/utils/limiteLogin');

describe('limite de tentativas de login', () => {
    afterEach(() => {
        jest.useRealTimers();
    });

    test('bloqueia depois de 5 falhas e libera ao limpar', () => {
        const chave = '1.1.1.1|a@b.com';
        for (let i = 0; i < MAX_TENTATIVAS - 1; i++) registrarFalha(chave);
        expect(minutosBloqueado(chave)).toBe(0);
        registrarFalha(chave);
        expect(minutosBloqueado(chave)).toBeGreaterThan(0);
        limparFalhas(chave);
        expect(minutosBloqueado(chave)).toBe(0);
    });

    test('bloqueio dura 15 minutos a partir da 5ª falha, não da 1ª', () => {
        jest.useFakeTimers({ now: new Date('2026-01-01T10:00:00Z') });
        const chave = '2.2.2.2|c@d.com';
        registrarFalha(chave);
        jest.setSystemTime(new Date('2026-01-01T10:14:00Z'));
        for (let i = 1; i < MAX_TENTATIVAS; i++) registrarFalha(chave);
        expect(minutosBloqueado(chave)).toBe(15);
    });

    test('IPs diferentes não bloqueiam um ao outro', () => {
        const atacante = '3.3.3.3|admin@ecan.com.br';
        for (let i = 0; i < MAX_TENTATIVAS; i++) registrarFalha(atacante);
        expect(minutosBloqueado(atacante)).toBeGreaterThan(0);
        expect(minutosBloqueado('4.4.4.4|admin@ecan.com.br')).toBe(0);
    });
});
