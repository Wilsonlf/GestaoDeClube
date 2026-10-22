const { Op } = require('sequelize');
const sequelize = require('../config/database');
const CategoriaPagamento = require('../models/CategoriaPagamento');
const PagamentoClube = require('../models/PagamentoClube');

const CATEGORIAS_PADRAO = {
    salarios: 'Salários',
    manutencao: 'Manutenção',
    arbitragem: 'Arbitragem',
    transporte: 'Transporte',
    material: 'Material esportivo',
    outros: 'Outros'
};

async function garantirCategoriasPadrao() {
    try {
        if (await CategoriaPagamento.count() > 0) return;

        await CategoriaPagamento.bulkCreate(
            Object.values(CATEGORIAS_PADRAO).map((nome) => ({ nome }))
        );
        for (const [chave, nome] of Object.entries(CATEGORIAS_PADRAO)) {
            await PagamentoClube.update({ categoria: nome }, { where: { categoria: chave } });
        }
    } catch (erro) {
        console.error('Erro ao criar categorias padrão:', erro);
    }
}

async function renderizarLista(res, { erro = null, dados = {} } = {}) {
    const categorias = await CategoriaPagamento.findAll({ order: [['nome', 'ASC']] });

    const usos = await PagamentoClube.findAll({
        attributes: ['categoria', [sequelize.fn('COUNT', sequelize.col('id')), 'total']],
        group: ['categoria'],
        raw: true
    });
    const totalPorCategoria = {};
    usos.forEach((u) => { totalPorCategoria[u.categoria] = Number(u.total); });

    res.render('admin/categorias-pagamento', { categorias, totalPorCategoria, erro, dados });
}

function validarNome(nome) {
    const limpo = (nome || '').trim();
    if (!limpo) return { erro: 'Informe o nome da categoria.' };
    if (limpo.length > 60) return { erro: 'O nome pode ter no máximo 60 caracteres.' };
    return { nome: limpo };
}

async function nomeJaExiste(nome, ignorarId) {
    const where = { nome };
    if (ignorarId) where.id = { [Op.ne]: ignorarId };
    return (await CategoriaPagamento.count({ where })) > 0;
}

async function listarCategorias(req, res) {
    try {
        await renderizarLista(res);
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao carregar categorias');
    }
}

async function criarCategoria(req, res) {
    try {
        const { nome, erro } = validarNome(req.body.nome);
        if (erro) return renderizarLista(res, { erro, dados: req.body });

        if (await nomeJaExiste(nome)) {
            return renderizarLista(res, { erro: `A categoria "${nome}" já existe.`, dados: req.body });
        }

        await CategoriaPagamento.create({ nome });
        res.redirect('/admin/pagamentos/categorias');
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao cadastrar categoria');
    }
}

async function atualizarCategoria(req, res) {
    try {
        const categoria = await CategoriaPagamento.findByPk(req.params.id);
        if (!categoria) {
            return res.status(404).send('Categoria não encontrada');
        }

        const { nome, erro } = validarNome(req.body.nome);
        if (erro) return renderizarLista(res, { erro });

        if (await nomeJaExiste(nome, categoria.id)) {
            return renderizarLista(res, { erro: `A categoria "${nome}" já existe.` });
        }

        const nomeAntigo = categoria.nome;
        await sequelize.transaction(async (t) => {
            await categoria.update({ nome }, { transaction: t });
            await PagamentoClube.update(
                { categoria: nome },
                { where: { categoria: nomeAntigo }, transaction: t }
            );
        });

        res.redirect('/admin/pagamentos/categorias');
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao atualizar categoria');
    }
}

async function excluirCategoria(req, res) {
    try {
        const categoria = await CategoriaPagamento.findByPk(req.params.id);
        if (!categoria) {
            return res.status(404).send('Categoria não encontrada');
        }

        const emUso = await PagamentoClube.count({ where: { categoria: categoria.nome } });
        if (emUso > 0) {
            return renderizarLista(res, {
                erro: `Não é possível excluir "${categoria.nome}": ela está em ${emUso} pagamento(s). Mude a categoria desses pagamentos antes.`
            });
        }

        await categoria.destroy();
        res.redirect('/admin/pagamentos/categorias');
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao remover categoria');
    }
}

module.exports = {
    garantirCategoriasPadrao,
    listarCategorias,
    criarCategoria,
    atualizarCategoria,
    excluirCategoria
};
