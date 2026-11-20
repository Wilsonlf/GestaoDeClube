const fs = require('fs');
const { textoDaBusca } = require('../utils/entrada');
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

function lerInteiroOpcional(valor) {
    const texto = String(valor ?? '').trim();
    if (texto === '') return null;
    const numero = Number(texto);
    return Number.isInteger(numero) ? numero : NaN;
}

function validarJogador(corpo) {
    const nome = String(corpo.nome || '').trim();
    const posicao = String(corpo.posicao || '').trim();
    const numero = lerInteiroOpcional(corpo.numero);
    const ordem = lerInteiroOpcional(corpo.ordem);

    if (!nome) {
        return { erro: 'Preencha o nome do jogador.' };
    }
    if (Number.isNaN(numero) || (numero !== null && (numero < 0 || numero > 99))) {
        return { erro: 'O número da camisa deve ser um inteiro entre 0 e 99.' };
    }
    if (Number.isNaN(ordem) || (ordem !== null && ordem < 0)) {
        return { erro: 'A ordem deve ser um número inteiro, zero ou maior.' };
    }

    return { dados: { nome, posicao: posicao || null, numero, ordem: ordem ?? 0 } };
}

async function listarJogadores(req, res) {
    try {
        const termo = textoDaBusca(req.query.busca);

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
    const foto = req.file ? `/uploads/jogadores/${req.file.filename}` : null;

    try {
        const { erro, dados } = validarJogador(req.body);
        if (erro) {
            removerArquivoFoto(foto);
            return res.render('admin/jogador-form', { jogador: { ...req.body }, erro });
        }

        await Jogador.create({ ...dados, foto });
        res.redirect('/admin/elenco');
    } catch (erro) {
        removerArquivoFoto(foto);
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
    const fotoNova = req.file ? `/uploads/jogadores/${req.file.filename}` : null;

    try {
        const jogador = await Jogador.findByPk(id);
        if (!jogador) {
            removerArquivoFoto(fotoNova);
            return res.status(404).send('Jogador não encontrado');
        }

        const { erro, dados } = validarJogador(req.body);
        if (erro) {
            removerArquivoFoto(fotoNova);
            return res.render('admin/jogador-form', {
                jogador: { ...req.body, id, foto: jogador.foto },
                erro
            });
        }

        const fotoAntiga = jogador.foto;
        await jogador.update({ ...dados, foto: fotoNova || fotoAntiga });
        if (fotoNova && fotoAntiga) {
            removerArquivoFoto(fotoAntiga);
        }

        res.redirect('/admin/elenco');
    } catch (erro) {
        removerArquivoFoto(fotoNova);
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

        const foto = jogador.foto;
        await jogador.destroy();
        removerArquivoFoto(foto);
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
