process.env.JWT_SECRET = 'segredo-de-teste';

const request = require('supertest');
const app = require('../app');

describe('integração HTTP (sem banco)', () => {
    test('página de login responde 200 e sem X-Powered-By', async () => {
        const resposta = await request(app).get('/login');
        expect(resposta.statusCode).toBe(200);
        expect(resposta.headers['x-powered-by']).toBeUndefined();
        expect(resposta.headers['x-content-type-options']).toBe('nosniff');
    });

    test('/admin sem sessão redireciona para o login', async () => {
        const resposta = await request(app).get('/admin/dashboard');
        expect(resposta.statusCode).toBe(302);
        expect(resposta.headers.location).toBe('/login');
    });

    test('/meus-ingressos sem sessão redireciona para o login', async () => {
        const resposta = await request(app).get('/meus-ingressos');
        expect(resposta.statusCode).toBe(302);
        expect(resposta.headers.location).toBe('/login');
    });

    test('POST vindo de outro site é bloqueado (CSRF)', async () => {
        const resposta = await request(app)
            .post('/admin/usuarios/1/tipo')
            .set('Origin', 'https://site-malicioso.com')
            .type('form')
            .send({ tipo: 'admin' });
        expect(resposta.statusCode).toBe(403);
    });

    test('JSON malformado não devolve stack trace', async () => {
        const resposta = await request(app)
            .post('/login')
            .set('Content-Type', 'application/json')
            .send('{x');
        expect(resposta.statusCode).toBe(400);
        expect(JSON.stringify(resposta.body)).not.toMatch(/at |node_modules|Users/);
    });

    test('webhook recusa id de pagamento que não é número', async () => {
        const resposta = await request(app).post('/pagamento/webhook?type=payment&data.id=../../users/me');
        expect(resposta.statusCode).toBe(400);
    });

    test('rota inexistente devolve 404', async () => {
        const resposta = await request(app).get('/nao-existe');
        expect(resposta.statusCode).toBe(404);
    });
});
