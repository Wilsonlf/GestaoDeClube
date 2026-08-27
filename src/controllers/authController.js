const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
const SocioTorcedor = require('../models/SocioTorcedor');

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
        const { nome, email, senha, cpf, telefone } = req.body;

        if (!nome || !email || !senha) {
            return res.status(400).json({ erro: 'Preencha nome, e-mail e senha.' });
        }

        const existente = await Usuario.findOne({ where: { email } });
        if (existente) {
            return res.status(400).json({ erro: 'Este e-mail já está cadastrado.' });
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

        const usuario = await Usuario.findOne({ where: { email } });
        if (!usuario) {
            return res.status(401).json({ erro: 'E-mail ou senha inválidos.' });
        }

        const senhaValida = await bcrypt.compare(senha, usuario.senha);
        if (!senhaValida) {
            return res.status(401).json({ erro: 'E-mail ou senha inválidos.' });
        }

        const token = jwt.sign(
            { id: usuario.id, nome: usuario.nome, email: usuario.email, tipo: usuario.tipo },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            maxAge: 8 * 60 * 60 * 1000
        });

        const destino = usuario.tipo === 'admin' ? '/admin/dashboard' : '/';
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