const express = require('express');
const router = express.Router();

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

router.get('/ingressos', (req, res) => {
    res.render('ingressos');
});

module.exports = router;