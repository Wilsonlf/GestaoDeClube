const express = require('express');
const router = express.Router();

router.get('/dashboard', (req, res) => {
    res.render('admin/dashboard', {
    });
});

router.get('/socios', (req, res) => {
    res.render('admin/socios', {
    });
});

router.get('/noticias', (req, res) => {
    res.render('admin/noticias', {
    });
});

router.get('/elenco', (req, res) => {
    res.render('admin/elenco', {
    });
});

router.get('/pagamentos', (req, res) => {
    res.render('admin/pagamentos', {
    });
});

router.get('/relatorios', (req, res) => {
    res.render('admin/relatorios', {
    });
});

module.exports = router;