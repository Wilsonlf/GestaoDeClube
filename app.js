require('./src/models/Usuario');
require('./src/models/SocioTorcedor');
require('./src/models/Jogador');
require('./src/models/Noticia');
require('./src/models/Ingresso');
require('./src/models/Pagamento');
require('./src/models/Material');

const express = require('express');
const path = require('path');
const app = express();

const sequelize = require('./src/config/database');
const publicRoutes = require('./src/routes/public.routes');

app.use(express.json());

// Motor de views: os arquivos .ejs ficam em src/views
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));

// Arquivos estáticos (css, js, imagens) ficam em src/public
app.use(express.static(path.join(__dirname, 'src', 'public')));

// Rotas do site público (Home, Planos, Login, Estádio, Ingressos)
app.use('/', publicRoutes);

sequelize.sync()
    .then(() => {

        app.listen(3000, () => {
            console.log('Servidor rodando na porta 3000');
        });

    })
    .catch((erro) => {
        console.log('Erro ao conectar banco:', erro);
    });

module.exports = app;