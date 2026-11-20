const { Op } = require('sequelize');
const { APP_URL } = require('../config/ambiente');
const { Usuario, SocioTorcedor } = require('../models/Index');
const { desmarcarComoSocio } = require('./tipoUsuario');
const { obterPlanoDoSocio } = require('./socioDesconto');
const { enviarLembreteVencimento } = require('./email');
const { DIAS_AVISO_VENCIMENTO, somarDias } = require('./validadePlano');

const INTERVALO_VENCIMENTO_MS = 60 * 60 * 1000;

async function inativarSociosVencidos() {
    const agora = new Date();
    const vencidos = await SocioTorcedor.findAll({
        where: { status: 'ativo', validoAte: { [Op.lt]: agora } },
    });

    for (const socio of vencidos) {
        const [inativou] = await SocioTorcedor.update(
            { status: 'inativo' },
            { where: { id: socio.id, status: 'ativo', validoAte: { [Op.lt]: agora } } }
        );
        if (inativou) {
            await desmarcarComoSocio(socio.usuarioId);
            console.log(`Vencimento: sócio ${socio.id} inativado (plano vencido em ${new Date(socio.validoAte).toLocaleDateString('pt-BR')}).`);
        }
    }
}

async function enviarLembretesDeVencimento() {
    const agora = new Date();
    const aVencer = await SocioTorcedor.findAll({
        where: {
            status: 'ativo',
            validoAte: { [Op.gte]: agora, [Op.lte]: somarDias(agora, DIAS_AVISO_VENCIMENTO) },
        },
        include: [{ model: Usuario, attributes: ['id', 'nome', 'email'] }],
    });

    for (const socio of aVencer) {
        if (!socio.Usuario) continue;
        if (socio.lembreteEnviadoPara && new Date(socio.lembreteEnviadoPara).getTime() === new Date(socio.validoAte).getTime()) {
            continue;
        }

        const [marcou] = await SocioTorcedor.update(
            { lembreteEnviadoPara: socio.validoAte },
            { where: { id: socio.id, validoAte: socio.validoAte } }
        );
        if (!marcou) continue;

        try {
            const plano = obterPlanoDoSocio(socio.plano);
            await enviarLembreteVencimento({
                usuario: socio.Usuario,
                nomePlano: plano ? plano.nome : socio.plano,
                validoAte: socio.validoAte,
                link: `${APP_URL}/planos`,
            });
        } catch (erro) {
            console.error(`Erro ao enviar lembrete de vencimento ao sócio ${socio.id}:`, erro);
        }
    }
}

async function verificarVencimentos() {
    try {
        await inativarSociosVencidos();
        await enviarLembretesDeVencimento();
    } catch (erro) {
        console.error('Erro ao verificar vencimentos dos sócios:', erro);
    }
}

function agendarVencimentoSocios() {
    verificarVencimentos();
    setInterval(verificarVencimentos, INTERVALO_VENCIMENTO_MS).unref();
}

module.exports = { inativarSociosVencidos, enviarLembretesDeVencimento, agendarVencimentoSocios };
