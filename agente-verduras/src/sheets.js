const { google } = require('googleapis');

function getAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

async function registerOrder(orderData) {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const fecha = new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' });

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range: 'Pedidos!A:H',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [
        [
          fecha,
          orderData.nombre,
          orderData.productos,
          orderData.total,
          orderData.delivery,
          orderData.direccion,
          orderData.diaEntrega,
          'Pendiente',
        ],
      ],
    },
  });
}

module.exports = { registerOrder };
