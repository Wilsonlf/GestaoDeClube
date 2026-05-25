require('./src/models/Usuario');
require('./src/models/SocioTorcedor');
require('./src/models/Jogador');
require('./src/models/Noticia');
require('./src/models/Ingresso');
require('./src/models/Pagamento');
require('./src/models/Material');

const express = require('express');
const app = express();

const sequelize = require('./src/config/database');

app.use(express.json());

app.get('/', (req, res) => {
    res.send('Servidor funcionando');
});

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