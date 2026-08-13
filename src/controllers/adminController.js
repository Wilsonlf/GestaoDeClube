const Usuario = require('../models/Usuario');

async function listarUsuarios(req, res) {
    try {
        const usuarios = await Usuario.findAll({
            attributes: ['id', 'nome', 'email', 'tipo'],
            order: [['nome', 'ASC']]
        });
        res.render('admin/usuarios', { usuarios });
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao carregar usuários');
    }
}

async function atualizarTipo(req, res) {
    try {
        const { id } = req.params;
        const { tipo } = req.body;

        if (!['comum', 'socio', 'admin'].includes(tipo)) {
            return res.status(400).send('Tipo inválido');
        }

        await Usuario.update({ tipo }, { where: { id } });
        res.redirect('/admin/usuarios');
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao atualizar usuário');
    }
}

module.exports = { listarUsuarios, atualizarTipo };