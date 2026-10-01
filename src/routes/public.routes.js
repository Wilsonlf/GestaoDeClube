const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const Ingresso = require('../models/Ingresso');
const Noticia = require('../models/Noticia');
const Jogador = require('../models/Jogador');
const ingressoController = require('../controllers/ingressoController');
const noticiaController = require('../controllers/noticiaController');

router.get('/', async (req, res) => {
    try {
        const proximoJogo = await Ingresso.findOne({
            where: {
                status: 'ativo',
                dataPartida: { [Op.gte]: new Date() }
            },
            order: [['dataPartida', 'ASC']]
        });

        const noticiasRecentes = await Noticia.findAll({
            order: [['createdAt', 'DESC']],
            limit: 3
        });

        const jogadores = await Jogador.findAll({ order: [['ordem', 'ASC'], ['nome', 'ASC']] });

        res.render('index', { proximoJogo, noticiasRecentes, jogadores });
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao carregar a página inicial');
    }
});

router.get('/planos', (req, res) => {
    res.render('planos');
});

router.get('/login', (req, res) => {
    res.render('login');
});

router.get('/estadio', (req, res) => {
    res.render('estadio');
});

router.get('/ingressos', ingressoController.listarIngressosPublico);

router.get('/noticias', noticiaController.listarNoticiasPublico);
router.get('/noticias/:id', noticiaController.exibirNoticia);

router.get('/cadastro', (req, res) => {
    res.render('cadastro');
});

module.exports = router;