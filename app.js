require('dotenv').config();
require('./src/models/Usuario');
require('./src/models/SocioTorcedor');
require('./src/models/Jogador');
require('./src/models/Noticia');
require('./src/models/Ingresso');
require('./src/models/IngressoCompra');
require('./src/models/Pagamento');
require('./src/models/PagamentoClube');
require('./src/models/CategoriaPagamento');
require('./src/models/Material');
require('./src/models/RecuperacaoSenha');
require('./src/models/Index');

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const app = express();

const sequelize = require('./src/config/database');
const publicRoutes = require('./src/routes/public.routes');
const authRoutes = require('./src/routes/auth.routes');
const adminRoutes = require('./src/routes/admin.routes');
const pagamentoRoutes = require('./src/routes/pagamento.routes');
const { verificarOrigem } = require('./src/middlewares/origem');
const { variaveisFaltando } = require('./src/config/ambiente');
const { autenticar, apenasAdminOuPortaria, identificarUsuario } = require('./src/middlewares/auth');
const { agendarLimpezaComprasPendentes } = require('./src/utils/limparComprasPendentes');
const { agendarVencimentoSocios } = require('./src/utils/vencimentoSocios');
const { garantirCategoriasPadrao } = require('./src/controllers/categoriaPagamentoController');

const PORTA = Number(process.env.PORT) || 3000;

app.disable('x-powered-by');
app.set('trust proxy', 'loopback');

app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'DENY');
    res.set('Referrer-Policy', 'same-origin');
    next();
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));

app.use(express.static(path.join(__dirname, 'src', 'public')));

app.use(verificarOrigem);
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(cookieParser());
app.use(identificarUsuario);

app.use((req, res, next) => {
    res.locals.mpPublicKey = process.env.MP_PUBLIC_KEY || '';
    next();
});

app.use('/', publicRoutes);
app.use('/', authRoutes);
app.use('/', pagamentoRoutes);

app.use('/admin', autenticar, apenasAdminOuPortaria, (req, res, next) => {
    res.locals.usuarioLogado = req.usuario;
    res.locals.usuarioTipo = req.usuario?.tipo;
    next();
}, adminRoutes);

app.use((req, res) => {
    res.status(404).render('erro', {
        codigo: 404,
        titulo: 'Página não encontrada',
        mensagem: 'O endereço que você acessou não existe ou foi removido.',
        usuarioLogado: res.locals.usuarioLogado || null,
    });
});

app.use((erro, req, res, next) => {
    if (res.headersSent) {
        return next(erro);
    }

    const status = erro.status || erro.statusCode || 500;
    if (status >= 500) {
        console.error(erro);
    }

    const mensagem = status === 400 ? 'Requisição inválida.'
        : status === 413 ? 'Os dados enviados são grandes demais.'
            : status < 500 ? 'Não foi possível processar a requisição.'
                : 'Erro interno. Tente novamente.';

    if (req.is('application/json') || (req.get('accept') || '').includes('application/json')) {
        return res.status(status).json({ erro: mensagem });
    }
    res.status(status).send(mensagem);
});

async function iniciarServidor() {
    const faltando = variaveisFaltando();
    if (faltando.length > 0) {
        console.error(`Configure no .env antes de subir o servidor: ${faltando.join(', ')}`);
        process.exit(1);
    }

    try {
        await sequelize.authenticate();
        await sequelize.sync();
        await garantirCategoriasPadrao();
        app.listen(PORTA, () => {
            console.log(`Servidor rodando na porta ${PORTA}`);
        });
        agendarLimpezaComprasPendentes();
        agendarVencimentoSocios();
    } catch (erro) {
        console.error('Erro ao iniciar o servidor:', erro);
        process.exit(1);
    }
}

if (require.main === module) {
    iniciarServidor();
}

module.exports = app;
