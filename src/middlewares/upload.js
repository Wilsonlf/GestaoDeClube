const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const pastaDestino = path.join(__dirname, '..', 'public', 'uploads', 'jogadores');

const EXTENSOES_POR_TIPO = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
};

const TAMANHO_MAXIMO_MB = 5;

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        fs.mkdirSync(pastaDestino, { recursive: true });
        cb(null, pastaDestino);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${EXTENSOES_POR_TIPO[file.mimetype]}`);
    }
});

function filtroImagem(req, file, cb) {
    if (!Object.hasOwn(EXTENSOES_POR_TIPO, file.mimetype)) {
        return cb(new Error('Envie uma imagem JPG, PNG, WEBP ou GIF.'));
    }
    cb(null, true);
}

const upload = multer({
    storage,
    fileFilter: filtroImagem,
    limits: { fileSize: TAMANHO_MAXIMO_MB * 1024 * 1024 }
});

function mensagemDeErro(erro) {
    if (erro.code === 'LIMIT_FILE_SIZE') {
        return `A imagem deve ter no máximo ${TAMANHO_MAXIMO_MB} MB.`;
    }
    if (erro instanceof multer.MulterError) {
        return 'Não foi possível enviar a imagem.';
    }
    return erro.message || 'Erro no upload da imagem.';
}

function uploadFotoJogador(req, res, next) {
    upload.single('foto')(req, res, (erro) => {
        if (erro) {
            return res.status(400).send(`<p>${mensagemDeErro(erro)}</p><p><a href="javascript:history.back()">← Voltar ao formulário</a></p>`);
        }
        next();
    });
}

module.exports = { uploadFotoJogador };
