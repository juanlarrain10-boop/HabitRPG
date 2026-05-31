const { Redis } = require('@upstash/redis');

const inMemoryStore = {};
const MAX_MESSAGES = 20;

function getRedis() {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return null;
  return new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  });
}

async function getConversation(phoneNumber) {
  const redis = getRedis();
  if (redis) {
    return (await redis.get(`conv:${phoneNumber}`)) || { messages: [] };
  }
  return inMemoryStore[phoneNumber] || { messages: [] };
}

async function saveConversation(phoneNumber, conversation) {
  if (conversation.messages.length > MAX_MESSAGES) {
    conversation.messages = conversation.messages.slice(-MAX_MESSAGES);
  }

  const redis = getRedis();
  if (redis) {
    await redis.set(`conv:${phoneNumber}`, conversation, { ex: 86400 });
  } else {
    inMemoryStore[phoneNumber] = conversation;
  }
}

module.exports = { getConversation, saveConversation };
