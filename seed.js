const bcrypt = require('bcrypt');

const Usuario = require('./src/models/Usuario');
const Cliente = require('./src/models/Cliente');
const SocioTorcedor = require('./src/models/SocioTorcedor');
const Noticia = require('./src/models/Noticia');
const Jogador = require('./src/models/Jogador');
const Pagamento = require('./src/models/Pagamento');
const sequelize = require('./src/config/database');

async function seed() {
    await sequelize.sync({ alter: true });

    if (await Usuario.count() === 0) {
        const senhaHash = await bcrypt.hash('admin123', 10);
        await Usuario.create({
            nome: 'Admin Master',
            email: 'admin@ecan.com.br',
            senha: senhaHash
        });
        console.log('Usuário administrador criado -> email: admin@ecan.com.br | senha: admin123');
        console.log('IMPORTANTE: troque essa senha depois de logar pela primeira vez.');
    }

    if (await SocioTorcedor.count() === 0) {
        const cliente = await Cliente.create({
            nome: 'Cliente Teste',
            email: 'cliente@teste.com',
            senha: '123456',
            cpf: '000.000.000-00',
            telefone: '(67) 99999-0000'
        });

        await SocioTorcedor.bulkCreate([
            { clienteId: cliente.id, plano: 'Mensal', dataAssociacao: new Date(), status: 'ativo' }
        ]);
        console.log('Sócios de teste criados.');
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

    if (await Pagamento.count() === 0) {
        await Pagamento.bulkCreate([
            { descricao: 'Folha de pagamento', valor: 145000, data_pagamento: new Date('2026-02-05') },
            { descricao: 'Fornecedor de materiais', valor: 12300, data_pagamento: new Date('2026-02-03') }
        ]);
        console.log('Pagamentos de teste criados.');
    }

    console.log('Seed concluído!');
    process.exit(0);
}

seed().catch((erro) => {
    console.error('Erro ao popular o banco:', erro);
    process.exit(1);
});