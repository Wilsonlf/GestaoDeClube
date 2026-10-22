const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function somenteDigitos(valor) {
    return String(valor || '').replace(/\D/g, '');
}

function cpfValido(cpf) {
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

    for (let posicao = 9; posicao <= 10; posicao++) {
        let soma = 0;
        for (let i = 0; i < posicao; i++) {
            soma += Number(cpf[i]) * (posicao + 1 - i);
        }
        const digito = (soma * 10) % 11 % 10;
        if (digito !== Number(cpf[posicao])) return false;
    }
    return true;
}

function validarSenha(senha) {
    const senhaTexto = String(senha || '');
    if (senhaTexto.length < 8 || senhaTexto.length > 72) {
        return 'A senha deve ter entre 8 e 72 caracteres.';
    }
    if (!/[A-Za-z]/.test(senhaTexto) || !/\d/.test(senhaTexto)) {
        return 'A senha deve conter letras e números.';
    }
    return null;
}

function validarCadastro({ nome, email, senha, cpf, telefone }) {
    const nomeLimpo = String(nome || '').trim();
    const emailLimpo = String(email || '').trim().toLowerCase();
    const senhaTexto = String(senha || '');
    const cpfDigitos = somenteDigitos(cpf);
    const telefoneDigitos = somenteDigitos(telefone);

    if (!nomeLimpo || !emailLimpo || !senhaTexto || !cpfDigitos) {
        return { erro: 'Preencha nome, e-mail, CPF e senha.' };
    }
    if (nomeLimpo.length < 3 || nomeLimpo.length > 100) {
        return { erro: 'O nome deve ter entre 3 e 100 caracteres.' };
    }
    if (!REGEX_EMAIL.test(emailLimpo)) {
        return { erro: 'Informe um e-mail válido.' };
    }
    const erroSenha = validarSenha(senhaTexto);
    if (erroSenha) {
        return { erro: erroSenha };
    }
    if (!cpfValido(cpfDigitos)) {
        return { erro: 'CPF inválido.' };
    }
    if (telefone && (telefoneDigitos.length < 10 || telefoneDigitos.length > 11)) {
        return { erro: 'Telefone inválido. Use DDD + número.' };
    }

    return {
        dados: {
            nome: nomeLimpo,
            email: emailLimpo,
            senha: senhaTexto,
            cpf: cpfDigitos,
            telefone: String(telefone || '').trim() || null,
        },
    };
}

module.exports = { validarCadastro, validarSenha, cpfValido, somenteDigitos };
