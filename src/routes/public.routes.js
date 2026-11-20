const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const Ingresso = require('../models/Ingresso');
const Noticia = require('../models/Noticia');
const Jogador = require('../models/Jogador');
const ingressoController = require('../controllers/ingressoController');
const noticiaController = require('../controllers/noticiaController');
const { obterPlano } = require('../config/planos');
const { SocioTorcedor } = require('../models/Index');
const { obterPlanoDoSocio } = require('../utils/socioDesconto');
const { autenticar } = require('../middlewares/auth');

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

router.get('/planos', async (req, res) => {
    let planoAtual = null;
    try {
        const socio = req.usuario ? await SocioTorcedor.findOne({ where: { usuarioId: req.usuario.id } }) : null;
        const ativo = socio && socio.status === 'ativo';
        const vencido = socio && socio.status === 'inativo' && socio.validoAte;
        if (ativo || vencido) {
            const plano = obterPlanoDoSocio(socio.plano);
            planoAtual = {
                chave: plano ? plano.chave : null,
                nome: plano ? plano.nome : socio.plano,
                validoAte: socio.validoAte,
                ativo,
            };
        }
    } catch (erro) {
        console.error(erro);
    }

    res.render('planos', {
        planoAtual,
        nomePlano: (chave) => obterPlano(chave).nome,
        precoPlano: (chave) => 'R$ ' + obterPlano(chave).valor.toFixed(2).replace('.', ','),
        descontoPlano: (chave) => Math.round(obterPlano(chave).descontoIngresso * 100) + '%',
    });
});

router.get('/login', (req, res) => {
    res.render('login');
});

router.get('/estadio', (req, res) => {
    res.render('estadio');
});

router.get('/ingressos', ingressoController.listarIngressosPublico);
router.get('/meus-ingressos', autenticar, ingressoController.listarMeusIngressos);

router.get('/noticias', noticiaController.listarNoticiasPublico);
router.get('/noticias/:id', noticiaController.exibirNoticia);

router.get('/cadastro', (req, res) => {
    res.render('cadastro');
});

module.exports = router;