const https = require('https');
const http = require('http');

const TARGET = process.argv[2] || 'local';
const MESSAGE = process.argv[3] || 'Hola';
const FROM = process.argv[4] || '56983987703';

const isLocal = TARGET === 'local';
const url = isLocal
  ? 'http://localhost:3000/api/webhook'
  : 'https://agente-verduras.vercel.app/api/webhook';

const payload = JSON.stringify({
  object: 'whatsapp_business_account',
  entry: [
    {
      id: '1766299771198810',
      changes: [
        {
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: '56983987703',
              phone_number_id: '1080472468490794',
            },
            contacts: [{ profile: { name: 'Test User' }, wa_id: FROM }],
            messages: [
              {
                from: FROM,
                id: `wamid.test_${Date.now()}`,
                timestamp: Math.floor(Date.now() / 1000).toString(),
                type: 'text',
                text: { body: MESSAGE },
              },
            ],
          },
          field: 'messages',
        },
      ],
    },
  ],
});

const urlObj = new URL(url);
const lib = urlObj.protocol === 'https:' ? https : http;

const options = {
  hostname: urlObj.hostname,
  port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
  path: urlObj.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  },
};

console.log(`\nEnviando mensaje al webhook (${TARGET}):`);
console.log(`  URL:     ${url}`);
console.log(`  De:      ${FROM}`);
console.log(`  Mensaje: ${MESSAGE}\n`);

const req = lib.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => (body += chunk));
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    if (body) console.log(`Body:   ${body}`);
    console.log('\nMensaje enviado. Revisa los logs del servidor para ver la respuesta de Claude.');
  });
});

req.on('error', (err) => {
  console.error('Error:', err.message);
  if (err.code === 'ECONNREFUSED') {
    console.error('¿Está corriendo el servidor local? Ejecuta: vercel dev');
  }
});

req.write(payload);
req.end();
