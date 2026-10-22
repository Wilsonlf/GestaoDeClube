const PDFDocument = require('pdfkit');
const { Op } = require('sequelize');
const SocioTorcedor = require('../models/SocioTorcedor');
const Pagamento = require('../models/Pagamento');
const PagamentoClube = require('../models/PagamentoClube');
const Ingresso = require('../models/Ingresso');
const IngressoCompra = require('../models/IngressoCompra');

const NOMES_PLANOS = { ninho: 'Ninho', asas_negras: 'Asas Negras', voo_supremo: 'Voo Supremo' };
const CORES_PLANOS = { ninho: '#a01421', asas_negras: '#c9a24a', voo_supremo: '#7d7b76' };
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function moeda(valor) {
    return 'R$ ' + Number(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function dataISO(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatarDataBR(iso) {
    return iso.split('-').reverse().join('/');
}

function lerPeriodo(query) {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    const hoje = new Date();
    let inicio = regex.test(query.inicio || '') ? query.inicio : `${hoje.getFullYear()}-01-01`;
    let fim = regex.test(query.fim || '') ? query.fim : dataISO(hoje);
    if (inicio > fim) [inicio, fim] = [fim, inicio];
    return { inicio, fim };
}

async function coletarDados({ inicio, fim }) {
    const dataInicio = new Date(`${inicio}T00:00:00`);
    const dataFim = new Date(`${fim}T23:59:59.999`);

    const [socios, pagamentosSocios, compras, despesas, pendenciasPlano, pendenciasIngresso] = await Promise.all([
        SocioTorcedor.findAll({ where: { status: 'ativo' }, attributes: ['plano'] }),
        Pagamento.findAll({
            where: { status: 'aprovado', data_pagamento: { [Op.between]: [dataInicio, dataFim] } }
        }),
        IngressoCompra.findAll({
            where: { status: 'aprovado', createdAt: { [Op.between]: [dataInicio, dataFim] } },
            include: [{ model: Ingresso, attributes: ['partida', 'dataPartida'] }]
        }),
        PagamentoClube.findAll({
            where: { dataPagamento: { [Op.between]: [inicio, fim] } },
            order: [['dataPagamento', 'ASC']]
        }),
        Pagamento.count({ where: { status: 'pendente' } }),
        IngressoCompra.count({ where: { status: 'pendente' } })
    ]);

    const receitaPlanos = pagamentosSocios.reduce((s, p) => s + Number(p.valor), 0);
    const receitaIngressos = compras.reduce((s, c) => s + Number(c.valorTotal), 0);
    const totalDespesas = despesas.reduce((s, d) => s + Number(d.valor), 0);

    const contagem = {};
    socios.forEach((s) => {
        const chave = String(s.plano || '').toLowerCase().replace(/\s+/g, '_');
        contagem[chave] = (contagem[chave] || 0) + 1;
    });
    const distribuicaoPlanos = Object.keys(contagem).map((chave) => ({
        nome: NOMES_PLANOS[chave] || chave,
        qtd: contagem[chave],
        pct: Math.round((contagem[chave] / socios.length) * 100),
        cor: CORES_PLANOS[chave] || '#555555'
    }));

    const porMesMapa = {};
    const somar = (iso, campo, valor) => {
        const chave = iso.slice(0, 7);
        porMesMapa[chave] = porMesMapa[chave] || { receita: 0, despesa: 0 };
        porMesMapa[chave][campo] += valor;
    };
    pagamentosSocios.forEach((p) => somar(dataISO(new Date(p.data_pagamento)), 'receita', Number(p.valor)));
    compras.forEach((c) => somar(dataISO(new Date(c.createdAt)), 'receita', Number(c.valorTotal)));
    despesas.forEach((d) => somar(d.dataPagamento, 'despesa', Number(d.valor)));
    const porMes = Object.keys(porMesMapa).sort().map((chave) => ({
        mes: `${MESES[Number(chave.slice(5, 7)) - 1]}/${chave.slice(2, 4)}`,
        receita: porMesMapa[chave].receita,
        despesa: porMesMapa[chave].despesa
    }));

    const catMapa = {};
    despesas.forEach((d) => { catMapa[d.categoria] = (catMapa[d.categoria] || 0) + Number(d.valor); });
    const despesasPorCategoria = Object.keys(catMapa)
        .map((nome) => ({ nome, valor: catMapa[nome] }))
        .sort((a, b) => b.valor - a.valor);

    const partidaMapa = {};
    compras.forEach((c) => {
        const chave = c.ingressoId;
        partidaMapa[chave] = partidaMapa[chave] || {
            partida: c.Ingresso ? c.Ingresso.partida : `Partida #${chave}`,
            vendidos: 0, receita: 0, utilizados: 0
        };
        partidaMapa[chave].vendidos += c.quantidade;
        partidaMapa[chave].receita += Number(c.valorTotal);
        if (c.statusCheckin === 'utilizado') partidaMapa[chave].utilizados += c.quantidade;
    });
    const ingressosPorPartida = Object.values(partidaMapa).sort((a, b) => b.receita - a.receita);

    return {
        periodo: { inicio, fim },
        totalSocios: socios.length,
        receitaPlanos,
        receitaIngressos,
        receitaTotal: receitaPlanos + receitaIngressos,
        totalDespesas,
        saldo: receitaPlanos + receitaIngressos - totalDespesas,
        pendencias: pendenciasPlano + pendenciasIngresso,
        distribuicaoPlanos,
        porMes,
        despesasPorCategoria,
        ingressosPorPartida,
        despesas
    };
}

async function exibirRelatorios(req, res) {
    try {
        const periodo = lerPeriodo(req.query);
        const dados = await coletarDados(periodo);
        res.render('admin/relatorios', { ...dados, moeda });
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao carregar relatórios');
    }
}

const COR_PRIMARIA = '#a01421';
const COR_TEXTO = '#222222';
const COR_MUTED = '#777777';

function tituloSecao(doc, texto) {
    if (doc.y > 700) doc.addPage();
    doc.moveDown(1);
    doc.font('Helvetica-Bold').fontSize(12).fillColor(COR_PRIMARIA).text(texto.toUpperCase());
    doc.moveTo(doc.page.margins.left, doc.y + 2).lineTo(doc.page.width - doc.page.margins.right, doc.y + 2)
        .strokeColor(COR_PRIMARIA).lineWidth(1).stroke();
    doc.moveDown(0.6);
    doc.fillColor(COR_TEXTO);
}

function tabela(doc, colunas, linhas) {
    const x0 = doc.page.margins.left;
    const desenharLinha = (valores, negrito) => {
        if (doc.y > 760) doc.addPage();
        const y = doc.y;
        let x = x0;
        doc.font(negrito ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor(COR_TEXTO);
        valores.forEach((v, i) => {
            doc.text(String(v), x, y, { width: colunas[i].largura - 6, align: colunas[i].alinhar || 'left', lineBreak: false, ellipsis: true });
            x += colunas[i].largura;
        });
        doc.y = y + 15;
        if (negrito) {
            doc.moveTo(x0, doc.y - 2).lineTo(x0 + colunas.reduce((s, c) => s + c.largura, 0), doc.y - 2)
                .strokeColor('#bbbbbb').lineWidth(0.5).stroke();
        }
    };
    desenharLinha(colunas.map((c) => c.titulo), true);
    if (linhas.length === 0) {
        doc.font('Helvetica-Oblique').fontSize(9).fillColor(COR_MUTED).text('Sem registros no período.', x0, doc.y);
        doc.moveDown(0.5);
    }
    linhas.forEach((l) => desenharLinha(l, false));
}

async function gerarPdf(req, res) {
    try {
        const periodo = lerPeriodo(req.query);
        const d = await coletarDados(periodo);

        const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="relatorio-${periodo.inicio}_a_${periodo.fim}.pdf"`);
        doc.pipe(res);

        doc.font('Helvetica-Bold').fontSize(20).fillColor(COR_PRIMARIA).text('Esporte Clube Águia Negra');
        doc.font('Helvetica').fontSize(13).fillColor(COR_TEXTO).text('Relatório administrativo');
        doc.fontSize(9).fillColor(COR_MUTED).text(
            `Período: ${formatarDataBR(periodo.inicio)} a ${formatarDataBR(periodo.fim)}  ·  Gerado em ${new Date().toLocaleString('pt-BR')}`
        );

        tituloSecao(doc, 'Resumo financeiro');
        tabela(doc, [{ titulo: 'Item', largura: 300 }, { titulo: 'Valor', largura: 195, alinhar: 'right' }], [
            ['Receita de planos (sócio torcedor)', moeda(d.receitaPlanos)],
            ['Receita de ingressos', moeda(d.receitaIngressos)],
            ['Receita total', moeda(d.receitaTotal)],
            ['Pagamentos realizados pelo clube', moeda(d.totalDespesas)],
            ['Saldo do período', moeda(d.saldo)]
        ]);
        doc.moveDown(0.3).font('Helvetica').fontSize(9).fillColor(COR_MUTED)
            .text(`Sócios ativos: ${d.totalSocios}  ·  Pagamentos pendentes de confirmação: ${d.pendencias}`, 50);

        tituloSecao(doc, 'Receita x despesa por mês');
        tabela(doc, [
            { titulo: 'Mês', largura: 135 },
            { titulo: 'Receita', largura: 120, alinhar: 'right' },
            { titulo: 'Despesa', largura: 120, alinhar: 'right' },
            { titulo: 'Saldo', largura: 120, alinhar: 'right' }
        ], d.porMes.map((m) => [m.mes, moeda(m.receita), moeda(m.despesa), moeda(m.receita - m.despesa)]));

        tituloSecao(doc, 'Sócios por plano');
        tabela(doc, [
            { titulo: 'Plano', largura: 250 },
            { titulo: 'Sócios', largura: 120, alinhar: 'right' },
            { titulo: '%', largura: 125, alinhar: 'right' }
        ], d.distribuicaoPlanos.map((p) => [p.nome, p.qtd, p.pct + '%']));

        tituloSecao(doc, 'Ingressos vendidos por partida');
        tabela(doc, [
            { titulo: 'Partida', largura: 215 },
            { titulo: 'Vendidos', largura: 70, alinhar: 'right' },
            { titulo: 'Utilizados', largura: 70, alinhar: 'right' },
            { titulo: 'Receita', largura: 140, alinhar: 'right' }
        ], d.ingressosPorPartida.map((p) => [p.partida, p.vendidos, p.utilizados, moeda(p.receita)]));

        tituloSecao(doc, 'Pagamentos do clube por categoria');
        tabela(doc, [
            { titulo: 'Categoria', largura: 300 },
            { titulo: 'Total', largura: 195, alinhar: 'right' }
        ], d.despesasPorCategoria.map((c) => [c.nome, moeda(c.valor)]));

        tituloSecao(doc, 'Pagamentos do clube (detalhado)');
        tabela(doc, [
            { titulo: 'Data', largura: 70 },
            { titulo: 'Descrição', largura: 230 },
            { titulo: 'Categoria', largura: 95 },
            { titulo: 'Valor', largura: 100, alinhar: 'right' }
        ], d.despesas.map((p) => [
            formatarDataBR(p.dataPagamento), p.descricao, p.categoria, moeda(p.valor)
        ]));

        const paginas = doc.bufferedPageRange();
        for (let i = 0; i < paginas.count; i++) {
            doc.switchToPage(paginas.start + i);
            doc.font('Helvetica').fontSize(8).fillColor(COR_MUTED)
                .text(`Página ${i + 1} de ${paginas.count}`, 50, doc.page.height - 35, { width: doc.page.width - 100, align: 'center', lineBreak: false });
        }

        doc.end();
    } catch (erro) {
        console.error(erro);
        if (!res.headersSent) {
            res.status(500).send('Erro ao gerar o relatório em PDF');
        } else {
            res.end();
        }
    }
}

module.exports = { exibirRelatorios, gerarPdf };
