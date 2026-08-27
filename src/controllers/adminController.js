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
        const usuario = await Usuario.findByPk(id);

        if (!usuario) {
            return res.status(404).send('Usuário não encontrado');
        }

        const novoTipo = usuario.tipo === 'admin' ? 'comum' : 'admin';

        await usuario.update({ tipo: novoTipo });
        res.redirect('/admin/usuarios');
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao atualizar tipo do usuário');
    }
}

module.exports = { listarUsuarios, atualizarTipo };