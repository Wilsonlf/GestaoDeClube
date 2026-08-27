const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const adminController = require('../controllers/adminController');
const socioController = require('../controllers/socioController');

const SocioTorcedor = require('../models/SocioTorcedor');
const Noticia = require('../models/Noticia');
const Jogador = require('../models/Jogador');
const Pagamento = require('../models/Pagamento');

router.get('/dashboard', async (req, res) => {
    try {
        const totalSocios = await SocioTorcedor.count();
        const noticiasRecentes = await Noticia.findAll({
            order: [['createdAt', 'DESC']],
            limit: 3
        });

        res.render('admin/dashboard', {
            totalSocios,
            noticiasRecentes
        });
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao carregar o dashboard');
    }
});

router.get('/noticias', async (req, res) => {
    try {
        const noticias = await Noticia.findAll({ order: [['createdAt', 'DESC']] });
        res.render('admin/noticias', { noticias });
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao carregar notícias');
    }
});

router.get('/elenco', async (req, res) => {
    try {
        const jogadores = await Jogador.findAll({ order: [['nome', 'ASC']] });
        res.render('admin/elenco', { jogadores });
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao carregar elenco');
    }
});

router.get('/socios', socioController.listarSocios);
router.get('/socios/novo', socioController.formNovoSocio);
router.post('/socios', socioController.criarSocio);
router.get('/socios/:id/editar', socioController.formEditarSocio);
router.post('/socios/:id', socioController.atualizarSocio);
router.post('/socios/:id/excluir', socioController.excluirSocio);

router.get('/relatorios', (req, res) => {
    res.render('admin/relatorios', {
    });
});

router.get('/usuarios', adminController.listarUsuarios);

router.post('/usuarios/:id/tipo', adminController.atualizarTipo);
router.post('/cadastro', authController.cadastrar);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

module.exports = router;