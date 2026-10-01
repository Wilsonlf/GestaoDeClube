const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const Jogador = require('../models/Jogador');

function removerArquivoFoto(foto) {
    if (!foto || !foto.startsWith('/uploads/')) {
        return;
    }
    const caminho = path.join(__dirname, '..', 'public', foto);
    fs.unlink(caminho, (erro) => {
        if (erro && erro.code !== 'ENOENT') {
            console.error(erro);
        }
    });
}

async function listarJogadores(req, res) {
    try {
        const termo = (req.query.busca || '').trim();

        const where = termo
            ? { nome: { [Op.like]: `%${termo}%` } }
            : undefined;

        const jogadores = await Jogador.findAll({
            where,
            order: [['ordem', 'ASC'], ['nome', 'ASC']]
        });

        res.render('admin/elenco', { jogadores, termo });
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao carregar elenco');
    }
}

function formNovoJogador(req, res) {
    res.render('admin/jogador-form', { jogador: null, erro: null });
}

async function criarJogador(req, res) {
    const { nome, numero, posicao, ordem } = req.body;
    const foto = req.file ? `/uploads/jogadores/${req.file.filename}` : null;

    try {
        if (!nome) {
            if (req.file) removerArquivoFoto(foto);
            return res.render('admin/jogador-form', {
                jogador: { nome, numero, posicao, ordem },
                erro: 'Preencha o nome do jogador.'
            });
        }

        await Jogador.create({
            nome,
            numero: numero || null,
            posicao: posicao || null,
            ordem: ordem || 0,
            foto
        });

        res.redirect('/admin/elenco');
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao criar jogador');
    }
}

async function formEditarJogador(req, res) {
    try {
        const jogador = await Jogador.findByPk(req.params.id);
        if (!jogador) {
            return res.status(404).send('Jogador não encontrado');
        }
        res.render('admin/jogador-form', { jogador, erro: null });
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao carregar jogador');
    }
}

async function atualizarJogador(req, res) {
    const { id } = req.params;
    const { nome, numero, posicao, ordem } = req.body;

    try {
        const jogador = await Jogador.findByPk(id);
        if (!jogador) {
            return res.status(404).send('Jogador não encontrado');
        }

        if (!nome) {
            if (req.file) removerArquivoFoto(`/uploads/jogadores/${req.file.filename}`);
            return res.render('admin/jogador-form', {
                jogador: { id, nome, numero, posicao, ordem, foto: jogador.foto },
                erro: 'Preencha o nome do jogador.'
            });
        }

        const foto = req.file ? `/uploads/jogadores/${req.file.filename}` : jogador.foto;
        if (req.file && jogador.foto) {
            removerArquivoFoto(jogador.foto);
        }

        await jogador.update({
            nome,
            numero: numero || null,
            posicao: posicao || null,
            ordem: ordem || 0,
            foto
        });

        res.redirect('/admin/elenco');
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao atualizar jogador');
    }
}

async function excluirJogador(req, res) {
    try {
        const jogador = await Jogador.findByPk(req.params.id);
        if (!jogador) {
            return res.status(404).send('Jogador não encontrado');
        }

        removerArquivoFoto(jogador.foto);
        await jogador.destroy();
        res.redirect('/admin/elenco');
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao remover jogador');
    }
}

module.exports = {
    listarJogadores,
    formNovoJogador,
    criarJogador,
    formEditarJogador,
    atualizarJogador,
    excluirJogador
};
