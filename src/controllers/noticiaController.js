const { Op } = require('sequelize');
const Noticia = require('../models/Noticia');

async function listarNoticias(req, res) {
    try {
        const termo = (req.query.busca || '').trim();

        const where = termo
            ? { titulo: { [Op.like]: `%${termo}%` } }
            : undefined;

        const noticias = await Noticia.findAll({
            where,
            order: [['createdAt', 'DESC']]
        });

        res.render('admin/noticias', { noticias, termo });
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao carregar notícias');
    }
}

function formNovaNoticia(req, res) {
    res.render('admin/noticia-form', { noticia: null, erro: null });
}

async function criarNoticia(req, res) {
    const { titulo, conteudo } = req.body;

    try {
        if (!titulo || !conteudo) {
            return res.render('admin/noticia-form', {
                noticia: { titulo, conteudo },
                erro: 'Preencha título e conteúdo.'
            });
        }

        await Noticia.create({ titulo, conteudo });
        res.redirect('/admin/noticias');
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao criar notícia');
    }
}

async function formEditarNoticia(req, res) {
    try {
        const noticia = await Noticia.findByPk(req.params.id);
        if (!noticia) {
            return res.status(404).send('Notícia não encontrada');
        }
        res.render('admin/noticia-form', { noticia, erro: null });
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao carregar notícia');
    }
}

async function atualizarNoticia(req, res) {
    const { id } = req.params;
    const { titulo, conteudo } = req.body;

    try {
        const noticia = await Noticia.findByPk(id);
        if (!noticia) {
            return res.status(404).send('Notícia não encontrada');
        }

        if (!titulo || !conteudo) {
            return res.render('admin/noticia-form', {
                noticia: { id, titulo, conteudo },
                erro: 'Preencha título e conteúdo.'
            });
        }

        await noticia.update({ titulo, conteudo });
        res.redirect('/admin/noticias');
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao atualizar notícia');
    }
}

async function excluirNoticia(req, res) {
    try {
        const noticia = await Noticia.findByPk(req.params.id);
        if (!noticia) {
            return res.status(404).send('Notícia não encontrada');
        }

        await noticia.destroy();
        res.redirect('/admin/noticias');
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao remover notícia');
    }
}

async function listarNoticiasPublico(req, res) {
    try {
        const noticias = await Noticia.findAll({ order: [['createdAt', 'DESC']] });
        res.render('noticias', { noticias, active: 'noticias' });
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao carregar notícias');
    }
}

async function exibirNoticia(req, res) {
    try {
        const noticia = await Noticia.findByPk(req.params.id);
        if (!noticia) {
            return res.status(404).send('Notícia não encontrada');
        }
        res.render('noticia', { noticia, active: 'noticias' });
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao carregar notícia');
    }
}

module.exports = {
    listarNoticias,
    formNovaNoticia,
    criarNoticia,
    formEditarNoticia,
    atualizarNoticia,
    excluirNoticia,
    listarNoticiasPublico,
    exibirNoticia
};
