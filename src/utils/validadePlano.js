const DIAS_VALIDADE_PLANO = 30;
const DIAS_AVISO_VENCIMENTO = 3;
const DIA_MS = 24 * 60 * 60 * 1000;

function somarDias(data, dias) {
    return new Date(new Date(data).getTime() + dias * DIA_MS);
}

function proximoVencimento(validoAte, agora = new Date()) {
    const base = validoAte && new Date(validoAte) > agora ? new Date(validoAte) : agora;
    return somarDias(base, DIAS_VALIDADE_PLANO);
}

function vencimentoAnterior(validoAte) {
    return validoAte ? somarDias(validoAte, -DIAS_VALIDADE_PLANO) : null;
}

module.exports = { DIAS_VALIDADE_PLANO, DIAS_AVISO_VENCIMENTO, somarDias, proximoVencimento, vencimentoAnterior };
