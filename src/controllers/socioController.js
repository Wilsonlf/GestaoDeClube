const { Op } = require('sequelize');
const { textoDaBusca } = require('../utils/entrada');
const { Usuario, SocioTorcedor } = require('../models/Index');
const Pagamento = require('../models/Pagamento');
const { listarPlanos } = require('../config/planos');
const { normalizarPlano, obterPlanoDoSocio } = require('../utils/socioDesconto');
const { marcarComoSocio, desmarcarComoSocio } = require('../utils/tipoUsuario');

const STATUS_SOCIO = ['ativo', 'inativo', 'pendente'];

function nomePlano(plano) {
    const info = obterPlanoDoSocio(plano);
    return info ? info.nome : (plano || '—');
}

async function listarSocios(req, res) {
    try {
        const termo = textoDaBusca(req.query.busca);

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

        res.render('admin/socios', { socios, termo, nomePlano });
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao carregar sócios');
    }
}

async function renderizarFormNovo(res, { dados = {}, erro = null } = {}) {
    const sociosAtuais = await SocioTorcedor.findAll({ attributes: ['usuarioId'] });
    const idsSocios = sociosAtuais.map(s => s.usuarioId).filter(Boolean);

    const usuariosDisponiveis = await Usuario.findAll({
        attributes: ['id', 'nome', 'email', 'cpf'],
        where: {
            id: { [Op.notIn]: idsSocios.length > 0 ? idsSocios : [0] }
        },
        order: [['nome', 'ASC']]
    });

    res.render('admin/socio-form', {
        socio: null,
        usuariosDisponiveis,
        planos: listarPlanos(),
        planoAtual: normalizarPlano(dados.plano),
        dados,
        erro
    });
}

async function formNovoSocio(req, res) {
    try {
        await renderizarFormNovo(res);
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao carregar formulário de sócio');
    }
}

function validarSocio({ plano, status }) {
    const chavePlano = normalizarPlano(plano);
    if (!listarPlanos().some((p) => p.chave === chavePlano)) {
        return { erro: 'Selecione um plano válido.' };
    }
    if (status !== undefined && status !== '' && !STATUS_SOCIO.includes(status)) {
        return { erro: 'Status inválido.' };
    }
    return { dados: { plano: chavePlano, status: status || 'ativo' } };
}

async function criarSocio(req, res) {
    try {
        const usuarioId = Number(req.body.usuarioId);
        const { erro, dados } = validarSocio(req.body);

        if (!Number.isInteger(usuarioId) || usuarioId < 1) {
            return renderizarFormNovo(res, { dados: req.body, erro: 'Selecione um usuário.' });
        }
        if (erro) {
            return renderizarFormNovo(res, { dados: req.body, erro });
        }

        const usuario = await Usuario.findByPk(usuarioId, { attributes: ['id'] });
        if (!usuario) {
            return renderizarFormNovo(res, { dados: req.body, erro: 'Usuário não encontrado.' });
        }

        const jaSocio = await SocioTorcedor.findOne({ where: { usuarioId } });
        if (jaSocio) {
            return renderizarFormNovo(res, { dados: req.body, erro: 'Este usuário já é sócio. Edite o cadastro existente.' });
        }

        await SocioTorcedor.create({
            usuarioId,
            plano: dados.plano,
            dataAssociacao: new Date(),
            status: dados.status
        });

        if (dados.status === 'ativo') {
            await marcarComoSocio(usuarioId);
        }

        res.redirect('/admin/socios');
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao vincular sócio');
    }
}

async function formEditarSocio(req, res) {
    try {
        const socio = await SocioTorcedor.findByPk(req.params.id, {
            include: [{ model: Usuario, attributes: ['id', 'nome', 'email'] }]
        });
        if (!socio || !socio.Usuario) {
            return res.status(404).send('Sócio não encontrado');
        }
        res.render('admin/socio-form', {
            socio,
            usuariosDisponiveis: [],
            planos: listarPlanos(),
            planoAtual: normalizarPlano(socio.plano),
            dados: null,
            erro: null
        });
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao carregar sócio');
    }
}

async function atualizarSocio(req, res) {
    try {
        const socio = await SocioTorcedor.findByPk(req.params.id, {
            include: [{ model: Usuario, attributes: ['id', 'nome', 'email'] }]
        });
        if (!socio) {
            return res.status(404).send('Sócio não encontrado');
        }

        const { erro, dados } = validarSocio({ plano: req.body.plano, status: req.body.status || socio.status });
        if (erro) {
            return res.render('admin/socio-form', {
                socio,
                usuariosDisponiveis: [],
                planos: listarPlanos(),
                planoAtual: normalizarPlano(req.body.plano),
                dados: req.body,
                erro
            });
        }

        await socio.update(dados);

        if (dados.status === 'ativo') {
            await marcarComoSocio(socio.usuarioId);
        } else {
            await desmarcarComoSocio(socio.usuarioId);
        }

        res.redirect('/admin/socios');
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao atualizar sócio');
    }
}

async function excluirSocio(req, res) {
    try {
        const socio = await SocioTorcedor.findByPk(req.params.id);
        if (!socio) {
            return res.status(404).send('Sócio não encontrado');
        }

        const pagamentos = await Pagamento.count({ where: { socioTorcedorId: socio.id } });
        if (pagamentos > 0) {
            return res.status(400).send('Este sócio tem pagamentos registrados e não pode ser excluído, para não apagar o histórico financeiro. Edite o cadastro e mude o status para Inativo.');
        }

        const usuarioId = socio.usuarioId;
        await socio.destroy();
        await desmarcarComoSocio(usuarioId);

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
