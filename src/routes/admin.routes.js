const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const adminController = require('../controllers/adminController');
const socioController = require('../controllers/socioController');
const ingressoController = require('../controllers/ingressoController');
const checagemController = require('../controllers/checagemController');
const pagamentoClubeController = require('../controllers/pagamentoClubeController');
const categoriaPagamentoController = require('../controllers/categoriaPagamentoController');
const relatorioController = require('../controllers/relatorioController');
const noticiaController =require('../controllers/noticiaController');
const jogadorController = require('../controllers/jogadorController');
const { apenasAdmin } = require('../middlewares/auth');
const { uploadFotoJogador } = require('../middlewares/upload');

const SocioTorcedor = require('../models/SocioTorcedor');
const Noticia = require('../models/Noticia');
const Pagamento = require('../models/Pagamento');

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

router.get('/noticias', apenasAdmin, noticiaController.listarNoticias);
router.get('/noticias/novo', apenasAdmin, noticiaController.formNovaNoticia);
router.post('/noticias', apenasAdmin, noticiaController.criarNoticia);
router.get('/noticias/:id/editar', apenasAdmin, noticiaController.formEditarNoticia);
router.post('/noticias/:id', apenasAdmin, noticiaController.atualizarNoticia);
router.post('/noticias/:id/excluir', apenasAdmin, noticiaController.excluirNoticia);

router.get('/elenco', apenasAdmin, jogadorController.listarJogadores);
router.get('/elenco/novo', apenasAdmin, jogadorController.formNovoJogador);
router.post('/elenco', apenasAdmin, uploadFotoJogador, jogadorController.criarJogador);
router.get('/elenco/:id/editar', apenasAdmin, jogadorController.formEditarJogador);
router.post('/elenco/:id', apenasAdmin, uploadFotoJogador, jogadorController.atualizarJogador);
router.post('/elenco/:id/excluir', apenasAdmin, jogadorController.excluirJogador);

router.get('/socios', apenasAdmin, socioController.listarSocios);
router.get('/socios/novo', apenasAdmin, socioController.formNovoSocio);
router.post('/socios', apenasAdmin, socioController.criarSocio);
router.get('/socios/:id/editar', apenasAdmin, socioController.formEditarSocio);
router.post('/socios/:id', apenasAdmin, socioController.atualizarSocio);
router.post('/socios/:id/excluir', apenasAdmin, socioController.excluirSocio);

router.get('/ingressos/vendas', apenasAdmin, ingressoController.listarVendasIngresso);
router.get('/ingressos', apenasAdmin, ingressoController.listarIngressos);
router.get('/ingressos/novo', apenasAdmin, ingressoController.formNovoIngresso);
router.post('/ingressos', apenasAdmin, ingressoController.criarIngresso);
router.get('/ingressos/:id/editar', apenasAdmin, ingressoController.formEditarIngresso);
router.post('/ingressos/:id', apenasAdmin, ingressoController.atualizarIngresso);
router.post('/ingressos/:id/excluir', apenasAdmin, ingressoController.excluirIngresso);

router.get('/pagamentos/categorias', apenasAdmin, categoriaPagamentoController.listarCategorias);
router.post('/pagamentos/categorias', apenasAdmin, categoriaPagamentoController.criarCategoria);
router.post('/pagamentos/categorias/:id', apenasAdmin, categoriaPagamentoController.atualizarCategoria);
router.post('/pagamentos/categorias/:id/excluir', apenasAdmin, categoriaPagamentoController.excluirCategoria);

router.get('/pagamentos', apenasAdmin, pagamentoClubeController.listarPagamentos);
router.get('/pagamentos/novo', apenasAdmin, pagamentoClubeController.formNovoPagamento);
router.post('/pagamentos', apenasAdmin, pagamentoClubeController.criarPagamento);
router.get('/pagamentos/:id/editar', apenasAdmin, pagamentoClubeController.formEditarPagamento);
router.post('/pagamentos/:id', apenasAdmin, pagamentoClubeController.atualizarPagamento);
router.post('/pagamentos/:id/excluir', apenasAdmin, pagamentoClubeController.excluirPagamento);

router.get('/relatorios/pdf', apenasAdmin, relatorioController.gerarPdf);
router.get('/relatorios', apenasAdmin, relatorioController.exibirRelatorios);

router.get('/usuarios', apenasAdmin, adminController.listarUsuarios);
router.post('/usuarios/:id/tipo', apenasAdmin, adminController.atualizarTipo);

router.get('/checagem', checagemController.formChecagem);
router.post('/checagem/validar', checagemController.validarPorHash);
router.post('/checagem/buscar-cpf', checagemController.buscarPorCpf);
router.post('/checagem/validar-manual', checagemController.validarManual);

router.post('/cadastro', apenasAdmin, authController.cadastrar);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

module.exports = router;