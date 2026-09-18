const express = require('express');
const router = express.Router();
const ingressoController = require('../controllers/ingressoController');

router.get('/', (req, res) => {
    res.render('index');
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

router.get('/cadastro', (req, res) => {
    res.render('cadastro');
});

module.exports = router;