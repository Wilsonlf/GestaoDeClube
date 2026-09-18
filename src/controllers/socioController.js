const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const { Usuario, SocioTorcedor } = require('../models/Index');

async function listarSocios(req, res) {
    try {
        const termo = (req.query.busca || '').trim();

        const whereUsuario = termo
            ? {
                [Op.or]: [
                    { nome: { [Op.like]: `%${termo}%` } },
                    { cpf: { [Op.like]: `%${termo}%` } }
                ]
            }
            : undefined;

        const socios = await SocioTorcedor.findAll({
            include: [{
                model: Usuario,
                attributes: ['id', 'nome', 'email', 'cpf', 'telefone'],
                where: whereUsuario
            }],
            order: [[Usuario, 'nome', 'ASC']]
        });

        res.render('admin/socios', { socios, termo });
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao carregar sócios');
    }
}

async function formNovoSocio(req, res) {
    try {
        const sociosAtuais = await SocioTorcedor.findAll({ attributes: ['usuarioId'] });
        const idsSocios = sociosAtuais.map(s => s.usuarioId);

        const usuariosDisponiveis = await Usuario.findAll({
            where: {
                id: { [Op.notIn]: idsSocios.length > 0 ? idsSocios : [0] }
            },
            order: [['nome', 'ASC']]
        });

        res.render('admin/socio-form', {
            socio: null,
            usuariosDisponiveis,
            dados: {},
            erro: null
        });
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao carregar formulário de sócio');
    }
}

async function criarSocio(req, res) {
    const { usuarioId, plano, status } = req.body;

    try {
        if (!usuarioId || !plano) {
            return formNovoSocio(req, res);
        }

        await SocioTorcedor.create({
            usuarioId,
            plano,
            dataAssociacao: new Date(),
            status: status || 'ativo'
        });

        await Usuario.update({ tipo: 'socio' }, { where: { id: usuarioId } });

        res.redirect('/admin/socios');
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao vincular sócio');
    }
}

async function formEditarSocio(req, res) {
    try {
        const socio = await SocioTorcedor.findByPk(req.params.id, { include: [Usuario] });
        if (!socio || !socio.Usuario) {
            return res.status(404).send('Sócio não encontrado');
        }
        res.render('admin/socio-form', { socio, usuariosDisponiveis: [], dados: null, erro: null });
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao carregar sócio');
    }
}

async function atualizarSocio(req, res) {
    const { id } = req.params;
    const { plano, status } = req.body;

    try {
        const socio = await SocioTorcedor.findByPk(id);
        if (!socio) {
            return res.status(404).send('Sócio não encontrado');
        }

        await socio.update({ plano, status: status || socio.status });
        res.redirect('/admin/socios');
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao atualizar sócio');
    }
}

async function excluirSocio(req, res) {
    try {
        const { id } = req.params;
        const socio = await SocioTorcedor.findByPk(id);
        if (!socio) {
            return res.status(404).send('Sócio não encontrado');
        }

        const usuarioId = socio.usuarioId;
        
        await socio.destroy();

        if (usuarioId) {
            await Usuario.update({ tipo: 'comum' }, { where: { id: usuarioId } });
        }

        res.redirect('/admin/socios');
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao remover sócio');
    }
}

module.exports = {
    listarSocios,
    formNovoSocio,
    criarSocio,
    formEditarSocio,
    atualizarSocio,
    excluirSocio
};