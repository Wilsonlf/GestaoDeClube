const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const adminController = require('../controllers/adminController');
const socioController = require('../controllers/socioController');
const ingressoController = require('../controllers/ingressoController');
const checagemController = require('../controllers/checagemController');
const { apenasAdmin } = require('../middlewares/auth');

const SocioTorcedor = require('../models/SocioTorcedor');
const Noticia = require('../models/Noticia');
const Jogador = require('../models/Jogador');
const Pagamento = require('../models/Pagamento');

// Este router é montado em /admin já autenticado, mas aberto tanto pra
// 'admin' quanto pra 'portaria' (ver app.js). A partir daqui, cada rota que
// não for de checagem precisa repetir `apenasAdmin` pra barrar a portaria —
// ela só pode passar pelas rotas de /checagem lá embaixo.
router.get('/dashboard', apenasAdmin, async (req, res) => {
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

router.get('/noticias', apenasAdmin, async (req, res) => {
    try {
        const noticias = await Noticia.findAll({ order: [['createdAt', 'DESC']] });
        res.render('admin/noticias', { noticias });
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao carregar notícias');
    }
});

router.get('/elenco', apenasAdmin, async (req, res) => {
    try {
        const jogadores = await Jogador.findAll({ order: [['nome', 'ASC']] });
        res.render('admin/elenco', { jogadores });
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao carregar elenco');
    }
});

router.get('/socios', apenasAdmin, socioController.listarSocios);
router.get('/socios/novo', apenasAdmin, socioController.formNovoSocio);
router.post('/socios', apenasAdmin, socioController.criarSocio);
router.get('/socios/:id/editar', apenasAdmin, socioController.formEditarSocio);
router.post('/socios/:id', apenasAdmin, socioController.atualizarSocio);
router.post('/socios/:id/excluir', apenasAdmin, socioController.excluirSocio);

// /vendas precisa vir antes de /:id/editar pra não ser interpretada como um id.
router.get('/ingressos/vendas', apenasAdmin, ingressoController.listarVendasIngresso);
router.get('/ingressos', apenasAdmin, ingressoController.listarIngressos);
router.get('/ingressos/novo', apenasAdmin, ingressoController.formNovoIngresso);
router.post('/ingressos', apenasAdmin, ingressoController.criarIngresso);
router.get('/ingressos/:id/editar', apenasAdmin, ingressoController.formEditarIngresso);
router.post('/ingressos/:id', apenasAdmin, ingressoController.atualizarIngresso);
router.post('/ingressos/:id/excluir', apenasAdmin, ingressoController.excluirIngresso);

router.get('/relatorios', apenasAdmin, (req, res) => {
    res.render('admin/relatorios', {
    });
});

router.get('/usuarios', apenasAdmin, adminController.listarUsuarios);
router.post('/usuarios/:id/tipo', apenasAdmin, adminController.atualizarTipo);

// Checagem de ingressos: única área do /admin liberada também pro tipo 'portaria'.
router.get('/checagem', checagemController.formChecagem);
router.post('/checagem/validar', checagemController.validarPorHash);
router.post('/checagem/buscar-cpf', checagemController.buscarPorCpf);
router.post('/checagem/validar-manual', checagemController.validarManual);

router.post('/cadastro', apenasAdmin, authController.cadastrar);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

module.exports = router;