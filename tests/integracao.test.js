const request = require('supertest');
const app = require('../app');

describe('Teste de integração da API', () => {

    test('Deve responder rota principal', async () => {

        const response = await request(app)
            .get('/');

        expect(response.statusCode).toBe(200);

    });

});