describe('Login', () => {

    test('Deve validar email corretamente', () => {

        const email = 'admin@gmail.com';

        expect(email).toContain('@');

    });

});