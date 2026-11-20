const OBRIGATORIAS = ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET', 'MP_ACCESS_TOKEN', 'MP_PUBLIC_KEY', 'APP_URL'];

const APP_URL = (process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');

function variaveisFaltando() {
    return OBRIGATORIAS.filter((nome) => !process.env[nome]);
}

module.exports = { APP_URL, variaveisFaltando };
