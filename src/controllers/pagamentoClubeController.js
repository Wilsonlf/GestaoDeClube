const PagamentoClube = require('../models/PagamentoClube');
const CategoriaPagamento = require('../models/CategoriaPagamento');

async function listarNomesCategorias() {
    const categorias = await CategoriaPagamento.findAll({ order: [['nome', 'ASC']] });
    return categorias.map((c) => c.nome);
}

async function validarDados({ descricao, categoria, valor, dataPagamento }) {
    if (!descricao || !descricao.trim() || !dataPagamento || valor === undefined || valor === '') {
        return 'Preencha descrição, valor e data do pagamento.';
    }
    if (!(Number(valor) > 0)) {
        return 'O valor deve ser maior que zero.';
    }
    if (!categoria || (await CategoriaPagamento.count({ where: { nome: categoria } })) === 0) {
        return 'Categoria inválida.';
    }
    return null;
}

async function renderizarForm(res, { pagamento, dados, erro }) {
    const categorias = await listarNomesCategorias();
    res.render('admin/pagamento-form', { pagamento, dados, erro, categorias });
}

async function listarPagamentos(req, res) {
    try {
        const pagamentos = await PagamentoClube.findAll({
            order: [['dataPagamento', 'DESC'], ['id', 'DESC']]
        });
        const total = pagamentos.reduce((soma, p) => soma + Number(p.valor), 0);
        res.render('admin/pagamentos', { pagamentos, total });
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao carregar pagamentos');
    }
}

async function formNovoPagamento(req, res) {
    try {
        await renderizarForm(res, { pagamento: null, dados: {}, erro: null });
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao carregar formulário');
    }
}

async function criarPagamento(req, res) {
    const { descricao, categoria, valor, dataPagamento, observacao } = req.body;

    try {
        const erro = await validarDados(req.body);
        if (erro) {
            return renderizarForm(res, { pagamento: null, dados: req.body, erro });
        }

        await PagamentoClube.create({
            descricao: descricao.trim(),
            categoria,
            valor,
            dataPagamento,
            observacao: observacao || null
        });
        res.redirect('/admin/pagamentos');
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao registrar pagamento');
    }
}

async function formEditarPagamento(req, res) {
    try {
        const pagamento = await PagamentoClube.findByPk(req.params.id);
        if (!pagamento) {
            return res.status(404).send('Pagamento não encontrado');
        }
        await renderizarForm(res, { pagamento, dados: null, erro: null });
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao carregar pagamento');
    }
}

async function atualizarPagamento(req, res) {
    const { descricao, categoria, valor, dataPagamento, observacao } = req.body;

    try {
        const pagamento = await PagamentoClube.findByPk(req.params.id);
        if (!pagamento) {
            return res.status(404).send('Pagamento não encontrado');
        }

        const erro = await validarDados(req.body);
        if (erro) {
            return renderizarForm(res, { pagamento, dados: req.body, erro });
        }

        await pagamento.update({
            descricao: descricao.trim(),
            categoria,
            valor,
            dataPagamento,
            observacao: observacao || null
        });
        res.redirect('/admin/pagamentos');
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao atualizar pagamento');
    }
}

async function excluirPagamento(req, res) {
    try {
        const pagamento = await PagamentoClube.findByPk(req.params.id);
        if (!pagamento) {
            return res.status(404).send('Pagamento não encontrado');
        }
        await pagamento.destroy();
        res.redirect('/admin/pagamentos');
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao remover pagamento');
    }
}

module.exports = {
    listarPagamentos,
    formNovoPagamento,
    criarPagamento,
    formEditarPagamento,
    atualizarPagamento,
    excluirPagamento
};
