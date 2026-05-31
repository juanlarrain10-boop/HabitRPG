require('dotenv').config();
const express = require('express');
const { getClaudeResponse } = require('../src/claude');
const { sendMessage, sendOrderNotification } = require('../src/whatsapp');
const { registerOrder } = require('../src/sheets');
const { getConversation, saveConversation } = require('../src/conversation');
const { SYSTEM_PROMPT } = require('../src/products');

const app = express();
app.use(express.json());

app.get('*', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

app.post('*', async (req, res) => {
  res.sendStatus(200);

  const message = extractMessage(req.body);
  if (!message) return;

  const { from, text } = message;

  try {
    const conversation = await getConversation(from);
    conversation.messages.push({ role: 'user', content: text });

    const rawResponse = await getClaudeResponse(conversation.messages, SYSTEM_PROMPT);

    const orderMatch = rawResponse.match(/\[PEDIDO_CONFIRMADO\]([\s\S]*?)\[\/PEDIDO_CONFIRMADO\]/);
    const cleanResponse = rawResponse.replace(/\[PEDIDO_CONFIRMADO\][\s\S]*?\[\/PEDIDO_CONFIRMADO\]/, '').trim();

    conversation.messages.push({ role: 'assistant', content: rawResponse });
    await saveConversation(from, conversation);

    await sendMessage(from, cleanResponse);

    if (orderMatch) {
      const orderDetails = extractOrderDetails(orderMatch[1]);
      await Promise.all([
        registerOrder(orderDetails),
        sendOrderNotification(orderDetails, from),
      ]);
    }
  } catch (err) {
    console.error('Error procesando mensaje:', err);
    await sendMessage(from, 'Lo siento, tuve un problema técnico. Por favor intenta de nuevo en un momento 🙏');
  }
});

function extractMessage(body) {
  try {
    const entry = body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const msg = value?.messages?.[0];

    if (!msg || msg.type !== 'text') return null;

    return {
      from: msg.from,
      text: msg.text.body,
    };
  } catch {
    return null;
  }
}

function extractOrderDetails(raw) {
  const lines = raw.trim().split('\n');
  const result = {};

  for (const line of lines) {
    const [key, ...rest] = line.split(':');
    const value = rest.join(':').trim();
    const k = key.trim().toUpperCase();

    if (k === 'NOMBRE') result.nombre = value;
    else if (k === 'PRODUCTOS') result.productos = value;
    else if (k === 'TOTAL') result.total = value;
    else if (k === 'DELIVERY') result.delivery = value;
    else if (k === 'DIRECCION') result.direccion = value;
    else if (k === 'DIA_ENTREGA') result.diaEntrega = value;
  }

  return result;
}

module.exports = app;
