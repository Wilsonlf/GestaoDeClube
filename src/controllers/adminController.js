const Usuario = require('../models/Usuario');
const SocioTorcedor = require('../models/SocioTorcedor');

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

const ACESSOS_VALIDOS = ['torcedor', 'portaria', 'admin'];

async function atualizarTipo(req, res) {
    try {
        const { id } = req.params;
        const acesso = req.body.tipo;

        if (!ACESSOS_VALIDOS.includes(acesso)) {
            return res.status(400).send('Tipo de usuário inválido');
        }

        const usuario = await Usuario.findByPk(id);
        if (!usuario) {
            return res.status(404).send('Usuário não encontrado');
        }

        let tipo = acesso;
        if (acesso === 'torcedor') {
            const socioAtivo = await SocioTorcedor.count({ where: { usuarioId: usuario.id, status: 'ativo' } });
            tipo = socioAtivo > 0 ? 'socio' : 'comum';
        }

        if (tipo === usuario.tipo) {
            return res.redirect('/admin/usuarios');
        }

        if (usuario.id === req.usuario.id) {
            return res.status(400).send('Você não pode alterar o seu próprio tipo de acesso. Peça para outro administrador.');
        }

        if (usuario.tipo === 'admin') {
            const totalAdmins = await Usuario.count({ where: { tipo: 'admin' } });
            if (totalAdmins <= 1) {
                return res.status(400).send('Este é o último administrador do sistema e não pode ser rebaixado.');
            }
        }

        await usuario.update({ tipo });
        res.redirect('/admin/usuarios');
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao atualizar tipo do usuário');
    }
}

module.exports = { listarUsuarios, atualizarTipo };
