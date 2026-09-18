require('dotenv').config();
require('./src/models/Usuario');
require('./src/models/SocioTorcedor');
require('./src/models/Jogador');
require('./src/models/Noticia');
require('./src/models/Ingresso');
require('./src/models/IngressoCompra');
require('./src/models/Pagamento');
require('./src/models/Material');
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
const verificarLogin = require('./src/middlewares/verificarLogin');
const { autenticar, apenasAdminOuPortaria } = require('./src/middlewares/auth');
const { identificarUsuario } = require('./src/middlewares/auth');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(verificarLogin);
app.use(identificarUsuario);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));

app.use(express.static(path.join(__dirname, 'src', 'public')));

app.use('/', publicRoutes);
app.use('/', authRoutes);
app.use('/', pagamentoRoutes);

app.use('/admin', autenticar, apenasAdminOuPortaria, (req, res, next) => {
    res.locals.usuarioLogado = req.usuario?.nome;
    res.locals.usuarioTipo = req.usuario?.tipo;
    next();
}, adminRoutes);

async function inicializarBanco() {
    try {
        await sequelize.sync();
        app.listen(3000, () => {
            console.log('Servidor rodando na porta 3000');
        });
    } catch (erro) {
        console.log('Erro ao conectar banco:', erro);
    }
}

inicializarBanco();