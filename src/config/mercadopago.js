console.log('Token carregado:', process.env.MP_ACCESS_TOKEN ? 'SIM (' + process.env.MP_ACCESS_TOKEN.slice(0, 15) + '...)' : 'NÃO — undefined!');

const { MercadoPagoConfig } = require('mercadopago');

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});

module.exports = client;