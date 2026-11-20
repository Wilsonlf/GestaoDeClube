const PagamentoClube = require('../models/PagamentoClube');
const CategoriaPagamento = require('../models/CategoriaPagamento');
const { lerValorMonetario, dataIsoValida } = require('../utils/entrada');

async function listarNomesCategorias() {
    const categorias = await CategoriaPagamento.findAll({ order: [['nome', 'ASC']] });
    return categorias.map((c) => c.nome);
}


async function validarDespesa(corpo) {
    const descricao = String(corpo.descricao || '').trim();
    const categoria = String(corpo.categoria || '');
    const valor = lerValorMonetario(corpo.valor);
    const dataPagamento = String(corpo.dataPagamento || '');

    if (!descricao || !dataPagamento || String(corpo.valor ?? '').trim() === '') {
        return { erro: 'Preencha descrição, valor e data do pagamento.' };
    }
    if (!Number.isFinite(valor)) {
        return { erro: 'Valor inválido. Use números, por exemplo 1500,00.' };
    }
    if (valor <= 0) {
        return { erro: 'O valor deve ser maior que zero.' };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataPagamento) || !dataIsoValida(dataPagamento)) {
        return { erro: 'Data do pagamento inválida.' };
    }
    if (!categoria || (await CategoriaPagamento.count({ where: { nome: categoria } })) === 0) {
        return { erro: 'Categoria inválida.' };
    }

    return {
        dados: {
            descricao,
            categoria,
            valor: Number(valor.toFixed(2)),
            dataPagamento,
            observacao: String(corpo.observacao || '').trim() || null,
        },
    };
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
    try {
        const { erro, dados } = await validarDespesa(req.body);
        if (erro) {
            return renderizarForm(res, { pagamento: null, dados: req.body, erro });
        }

        await PagamentoClube.create(dados);
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
    try {
        const pagamento = await PagamentoClube.findByPk(req.params.id);
        if (!pagamento) {
            return res.status(404).send('Pagamento não encontrado');
        }

        const { erro, dados } = await validarDespesa(req.body);
        if (erro) {
            return renderizarForm(res, { pagamento, dados: req.body, erro });
        }

        await pagamento.update(dados);
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
