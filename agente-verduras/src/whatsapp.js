const axios = require('axios');

const BASE_URL = 'https://graph.facebook.com/v18.0';

async function sendMessage(to, text) {
  await axios.post(
    `${BASE_URL}/${process.env.PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  );
}

async function sendOrderNotification(orderDetails, customerPhone) {
  const message =
    `🛒 *NUEVO PEDIDO*\n\n` +
    `👤 Cliente: ${orderDetails.nombre}\n` +
    `📦 Productos:\n${orderDetails.productos}\n\n` +
    `💰 Total: $${orderDetails.total}\n` +
    `🚚 Delivery: $${orderDetails.delivery}\n` +
    `📍 Dirección: ${orderDetails.direccion}\n` +
    `📅 Día de entrega: ${orderDetails.diaEntrega}\n` +
    `📱 WhatsApp cliente: +${customerPhone}`;

  const owners = [process.env.OWNER_PHONE_1, process.env.OWNER_PHONE_2].filter(Boolean);
  await Promise.all(owners.map((phone) => sendMessage(phone, message)));
}

module.exports = { sendMessage, sendOrderNotification };
