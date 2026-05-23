const express = require('express');
const app = express();

const sequelize = require('./src/config/database');

app.use(express.json());

sequelize.sync()
    .then(() => {
        app.listen(3000, () => {
            console.log('Servidor rodando na porta 3000');
        });
    })
    .catch((erro) => {
        console.log(erro);
    });

app.get('/', (req, res) => {
    res.send('Servidor funcionando');
});