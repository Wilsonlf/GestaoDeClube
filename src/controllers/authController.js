const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
const SocioTorcedor = require('../models/SocioTorcedor');
const { validarCadastro } = require('../utils/validacaoCadastro');
const { chaveLogin, minutosBloqueado, registrarFalha, limparFalhas } = require('../utils/limiteLogin');

async function criarUsuarioAdmin({ nome, email, senha }) {
    if (!nome || !email || !senha) {
        const erro = new Error('Preencha nome, e-mail e senha.');
        erro.status = 400;
        throw erro;
    }
    const senhaHash = await bcrypt.hash(senha, 10);
    return Usuario.create({ nome, email, senha: senhaHash, tipo: 'admin' });
}

async function cadastrar(req, res) {
    try {
        const { erro, dados } = validarCadastro(req.body);
        if (erro) {
            return res.status(400).json({ erro });
        }
        const { nome, email, senha, cpf, telefone } = dados;

        const existente = await Usuario.findOne({ where: { email } });
        if (existente) {
            return res.status(400).json({ erro: 'Este e-mail já está cadastrado.' });
        }

        const cpfEmUso = await Usuario.findOne({ where: { cpf } });
        if (cpfEmUso) {
            return res.status(400).json({ erro: 'Este CPF já está cadastrado.' });
        }

        const senhaHash = await bcrypt.hash(senha, 10);
        const usuario = await Usuario.create({
            nome,
            email,
            senha: senhaHash,
            cpf,
            telefone,
            tipo: 'comum' 
        });

        res.status(201).json({ sucesso: true, id: usuario.id });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao cadastrar. Tente novamente.' });
    }
}

async function login(req, res) {
    try {
        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({ erro: 'Informe e-mail e senha.' });
        }

        const chave = chaveLogin(req, email);
        const minutos = minutosBloqueado(chave);
        if (minutos > 0) {
            return res.status(429).json({
                erro: `Muitas tentativas de login. Tente novamente em ${minutos} minuto(s).`,
            });
        }

        const usuario = await Usuario.findOne({ where: { email: String(email).trim() } });
        const senhaValida = usuario && await bcrypt.compare(senha, usuario.senha);
        if (!senhaValida) {
            registrarFalha(chave);
            return res.status(401).json({ erro: 'E-mail ou senha inválidos.' });
        }
        limparFalhas(chave);

        const token = jwt.sign(
            { id: usuario.id, nome: usuario.nome, email: usuario.email, tipo: usuario.tipo },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            maxAge: 8 * 60 * 60 * 1000
        });

        let destino = '/';
        if (usuario.tipo === 'admin') destino = '/admin/dashboard';
        if (usuario.tipo === 'portaria') destino = '/admin/checagem';
        res.json({ sucesso: true, redirecionarPara: destino });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao entrar. Tente novamente.' });
    }
}

function logout(req, res) {
    res.clearCookie('token');
    res.redirect('/login');
}

module.exports = { criarUsuarioAdmin, cadastrar, login, logout };