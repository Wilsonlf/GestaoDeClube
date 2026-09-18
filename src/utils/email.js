const nodemailer = require('nodemailer');
const QRCode = require('qrcode');

// Envio de e-mail é opcional para rodar o projeto localmente: sem as variáveis
// MAIL_HOST/MAIL_USER/MAIL_PASS no .env, o transportador não é criado e
// enviarIngressoPorEmail() só loga um aviso e segue em frente — o webhook do
// Mercado Pago não pode falhar por causa disso.
function criarTransportador() {
    const { MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASS } = process.env;

    if (!MAIL_HOST || !MAIL_USER || !MAIL_PASS) {
        return null;
    }

    return nodemailer.createTransport({
        host: MAIL_HOST,
        port: Number(MAIL_PORT) || 587,
        secure: Number(MAIL_PORT) === 465,
        auth: { user: MAIL_USER, pass: MAIL_PASS },
    });
}

const transportador = criarTransportador();

// Envia o QR Code do ingresso para o e-mail já cadastrado do comprador.
// `compra` precisa vir com o hashQr já salvo; `ingresso` e `usuario` são os
// models relacionados (partida/local/data e nome/email, respectivamente).
async function enviarIngressoPorEmail({ usuario, ingresso, compra }) {
    if (!transportador) {
        console.warn('[email] MAIL_HOST/MAIL_USER/MAIL_PASS não configurados no .env — envio do QR do ingresso pulado.');
        return { enviado: false, motivo: 'e-mail não configurado' };
    }

    const qrBuffer = await QRCode.toBuffer(compra.hashQr, { width: 320, margin: 2 });
    const dataFmt = new Date(ingresso.dataPartida).toLocaleString('pt-BR', {
        dateStyle: 'long',
        timeStyle: 'short',
    });

    await transportador.sendMail({
        from: process.env.MAIL_FROM || process.env.MAIL_USER,
        to: usuario.email,
        subject: `Seu ingresso · ${ingresso.partida}`,
        html: `
            <div style="font-family: Arial, sans-serif; color:#1a1a1a; max-width:480px;">
                <h2 style="margin-bottom:4px;">Esporte Clube Águia Negra</h2>
                <p style="color:#555; margin-top:0;">Ingresso confirmado!</p>
                <p><strong>Partida:</strong> ${ingresso.partida}</p>
                <p><strong>Data:</strong> ${dataFmt}</p>
                <p><strong>Local:</strong> ${ingresso.local}</p>
                <p><strong>Quantidade:</strong> ${compra.quantidade}</p>
                <p><strong>Comprador:</strong> ${usuario.nome}</p>
                <p style="margin-top:20px;">Apresente o QR Code abaixo na portaria. Se não for possível ler o código, informe seu CPF no balcão.</p>
                <img src="cid:qr-ingresso" alt="QR Code do ingresso" style="width:220px; height:220px;" />
            </div>
        `,
        attachments: [
            {
                filename: 'ingresso-qr.png',
                content: qrBuffer,
                cid: 'qr-ingresso',
            },
        ],
    });

    return { enviado: true };
}

module.exports = { enviarIngressoPorEmail };
