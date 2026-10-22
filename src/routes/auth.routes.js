const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const recuperacaoSenhaController = require('../controllers/recuperacaoSenhaController');

router.post('/cadastro', authController.cadastrar);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

router.get('/esqueci-senha', recuperacaoSenhaController.paginaEsqueciSenha);
router.post('/esqueci-senha', recuperacaoSenhaController.solicitar);
router.get('/redefinir-senha/:token', recuperacaoSenhaController.paginaRedefinir);
router.post('/redefinir-senha', recuperacaoSenhaController.redefinir);

module.exports = router;