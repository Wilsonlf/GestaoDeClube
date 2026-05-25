describe('Estoque', () => {

    test('Quantidade de material não pode ser negativa', () => {

        const quantidade = 10;

        expect(quantidade).toBeGreaterThanOrEqual(0);

    });

});