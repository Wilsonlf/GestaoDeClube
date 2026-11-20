const Noticia = require('../models/Noticia');
const { coletarDados, moeda, dataISO } = require('./relatorioController');

async function exibirDashboard(req, res) {
    try {
        const hoje = new Date();
        const inicioDoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

        const [dados, noticiasRecentes] = await Promise.all([
            coletarDados({ inicio: dataISO(inicioDoMes), fim: dataISO(hoje) }),
            Noticia.findAll({ order: [['createdAt', 'DESC']], limit: 3 }),
        ]);

        res.render('admin/dashboard', {
            totalSocios: dados.totalSocios,
            receitaIngressos: moeda(dados.receitaIngressos),
            despesasMes: moeda(dados.totalDespesas),
            pendencias: dados.pendencias,
            noticiasRecentes,
        });
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao carregar o dashboard');
    }
}

module.exports = { exibirDashboard };
