const fs = require('fs');
const path = require('path');
const multer = require('multer');

const pastaDestino = path.join(__dirname, '..', 'public', 'uploads', 'jogadores');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        fs.mkdirSync(pastaDestino, { recursive: true });
        cb(null, pastaDestino);
    },
    filename: (req, file, cb) => {
        const sufixo = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, sufixo + path.extname(file.originalname));
    }
});

function filtroImagem(req, file, cb) {
    if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Envie apenas arquivos de imagem.'));
    }
    cb(null, true);
}

const upload = multer({
    storage,
    fileFilter: filtroImagem,
    limits: { fileSize: 5 * 1024 * 1024 }
});

function uploadFotoJogador(req, res, next) {
    upload.single('foto')(req, res, (erro) => {
        if (erro) {
            return res.status(400).send(erro.message || 'Erro no upload da imagem.');
        }
        next();
    });
}

module.exports = { uploadFotoJogador };
