const express = require('express');
const router = express.Router();
const pagamentoController = require('../controllers/pagamentoController');
const { autenticarApi } = require('../middlewares/auth');

router.post('/pagamento/criar', autenticarApi, pagamentoController.criarPagamento);
router.post('/pagamento/ingresso/criar', autenticarApi, pagamentoController.criarPagamentoIngresso);
router.post('/pagamento/webhook', pagamentoController.webhook);

router.get('/pagamento/sucesso', pagamentoController.paginaRetorno('sucesso'));
router.get('/pagamento/pendente', pagamentoController.paginaRetorno('pendente'));
router.get('/pagamento/erro', pagamentoController.paginaRetorno('erro'));

module.exports = router;