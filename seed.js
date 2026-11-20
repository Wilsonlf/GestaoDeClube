require('dotenv').config();
const crypto = require('crypto');
const bcrypt = require('bcrypt');

const sequelize = require('./src/config/database');
const { Usuario, SocioTorcedor } = require('./src/models/Index');
const Noticia = require('./src/models/Noticia');
const Jogador = require('./src/models/Jogador');
const PagamentoClube = require('./src/models/PagamentoClube');
require('./src/models/Ingresso');
require('./src/models/IngressoCompra');
require('./src/models/Pagamento');
require('./src/models/CategoriaPagamento');
require('./src/models/Material');
require('./src/models/RecuperacaoSenha');
const { garantirCategoriasPadrao } = require('./src/controllers/categoriaPagamentoController');
const { CUSTO_BCRYPT } = require('./src/utils/sessao');

function senhaInicial(variavel) {
    return process.env[variavel] || `${crypto.randomBytes(6).toString('base64url')}9a`;
}

async function seed() {
    await sequelize.authenticate();
    await sequelize.sync();
    await garantirCategoriasPadrao();

    if (await Usuario.count({ where: { tipo: 'admin' } }) === 0) {
        const senha = senhaInicial('SEED_ADMIN_SENHA');
        await Usuario.create({
            nome: 'Admin Master',
            email: 'admin@ecan.com.br',
            senha: await bcrypt.hash(senha, CUSTO_BCRYPT),
            tipo: 'admin'
        });
        console.log(`Administrador criado -> e-mail: admin@ecan.com.br | senha: ${senha}`);
        console.log('Troque essa senha pelo "Esqueci minha senha" depois do primeiro acesso.');
    }

    if (await SocioTorcedor.count() === 0) {
        const senha = senhaInicial('SEED_SOCIO_SENHA');
        const [usuario, criado] = await Usuario.findOrCreate({
            where: { email: 'socio@teste.com' },
            defaults: {
                nome: 'Sócio Teste',
                senha: await bcrypt.hash(senha, CUSTO_BCRYPT),
                cpf: '52998224725',
                telefone: '(67) 99999-0000',
                tipo: 'comum'
            }
        });
        await SocioTorcedor.create({
            usuarioId: usuario.id,
            plano: 'ninho',
            dataAssociacao: new Date(),
            status: 'ativo'
        });
        await Usuario.update({ tipo: 'socio' }, { where: { id: usuario.id, tipo: 'comum' } });
        console.log(criado
            ? `Sócio de teste criado -> e-mail: socio@teste.com | senha: ${senha}`
            : 'Sócio de teste vinculado ao usuário socio@teste.com que já existia.');
    }

    if (await Noticia.count() === 0) {
        await Noticia.bulkCreate([
            { titulo: 'Águia Negra estreia em casa com empate emocionante', conteudo: 'O time segurou o resultado nos minutos finais diante de mais de 2 mil torcedores no Ninho da Águia.' },
            { titulo: 'Reforço de peso assina contrato até 2027', conteudo: 'Clube anuncia a chegada de um novo atacante para a temporada.' }
        ]);
        console.log('Notícias de teste criadas.');
    }

    if (await Jogador.count() === 0) {
        await Jogador.bulkCreate([
            { nome: 'Rafael Costa', posicao: 'Atacante' },
            { nome: 'Bruno Lima', posicao: 'Zagueiro' },
            { nome: 'Pedro Henrique', posicao: 'Meia' }
        ]);
        console.log('Jogadores de teste criados.');
    }

    if (await PagamentoClube.count() === 0) {
        await PagamentoClube.bulkCreate([
            { descricao: 'Folha de pagamento', categoria: 'Salários', valor: 145000, dataPagamento: '2026-02-05' },
            { descricao: 'Fornecedor de materiais', categoria: 'Material esportivo', valor: 12300, dataPagamento: '2026-02-03' }
        ]);
        console.log('Despesas de teste criadas.');
    }

    console.log('Seed concluído!');
    await sequelize.close();
}

seed().catch(async (erro) => {
    console.error('Erro ao popular o banco:', erro);
    process.exitCode = 1;
    await sequelize.close().catch(() => {});
});
