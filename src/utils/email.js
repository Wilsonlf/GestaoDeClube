const nodemailer = require('nodemailer');
const QRCode = require('qrcode');

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

async function enviarRecuperacaoSenha({ usuario, link }) {
    if (!transportador) {
        console.warn('[email] MAIL_HOST/MAIL_USER/MAIL_PASS não configurados no .env — e-mail de recuperação de senha pulado.');
        return { enviado: false, motivo: 'e-mail não configurado' };
    }

    await transportador.sendMail({
        from: process.env.MAIL_FROM || process.env.MAIL_USER,
        to: usuario.email,
        subject: 'Redefinição de senha · Águia Negra',
        html: `
            <div style="font-family: Arial, sans-serif; color:#1a1a1a; max-width:480px;">
                <h2 style="margin-bottom:4px;">Esporte Clube Águia Negra</h2>
                <p>Olá, ${usuario.nome}.</p>
                <p>Recebemos um pedido para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha. O link vale por 1 hora.</p>
                <p style="margin:24px 0;">
                    <a href="${link}" style="background:#111; color:#fff; padding:12px 20px; border-radius:6px; text-decoration:none; font-weight:bold;">Redefinir senha</a>
                </p>
                <p style="color:#555; font-size:13px;">Se o botão não funcionar, copie este endereço no navegador:<br />${link}</p>
                <p style="color:#555; font-size:13px;">Se você não pediu a redefinição, ignore este e-mail. Sua senha continua a mesma.</p>
            </div>
        `,
    });

    return { enviado: true };
}

module.exports = { enviarIngressoPorEmail, enviarRecuperacaoSenha };
