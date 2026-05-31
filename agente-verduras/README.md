# Agente WhatsApp Verdulería 🥦

Agente de WhatsApp con IA para una verdulería con delivery en Santiago de Chile. Atiende clientes, toma pedidos y los registra automáticamente en Google Sheets.

## Requisitos previos

- Node.js 18+
- Cuenta de [Vercel](https://vercel.com) (gratis)
- Cuenta de [Meta for Developers](https://developers.facebook.com) con WhatsApp Business API habilitada
- Cuenta de Google con Google Sheets API habilitada
- API key de [Anthropic](https://console.anthropic.com)

---

## 1. Configurar WhatsApp Business API

1. Ve a [developers.facebook.com](https://developers.facebook.com) y crea una app de tipo **Business**
2. Agrega el producto **WhatsApp** a tu app
3. En **WhatsApp > Configuración de la API**, anota:
   - **Token de acceso** → `WHATSAPP_TOKEN`
   - **ID de número de teléfono** → `PHONE_NUMBER_ID`
4. En **WhatsApp > Configuración**, configura el webhook:
   - URL: `https://tu-proyecto.vercel.app/`
   - Token de verificación: el valor que pongas en `WEBHOOK_VERIFY_TOKEN`
   - Campos suscritos: `messages`

---

## 2. Configurar Google Sheets

1. Ve a [Google Cloud Console](https://console.cloud.google.com) y crea un proyecto
2. Habilita la **Google Sheets API**
3. Crea una **Cuenta de servicio** (Service Account):
   - IAM y administración → Cuentas de servicio → Crear
   - Descarga el archivo JSON de credenciales
4. Copia el contenido del JSON y minifícalo (todo en una línea) → `GOOGLE_SERVICE_ACCOUNT_JSON`
5. Crea un Google Sheet y copia su ID de la URL:
   - `https://docs.google.com/spreadsheets/d/**ID_AQUI**/edit`
   - Ese ID → `GOOGLE_SHEETS_ID`
6. Comparte el Sheet con el email de la cuenta de servicio (el campo `client_email` del JSON) con permisos de **editor**
7. Crea una hoja llamada `Pedidos` con estas columnas en la fila 1:
   ```
   Fecha | Nombre | Productos | Total | Delivery | Dirección | Día Entrega | Estado
   ```

---

## 3. Configurar Vercel KV (base de datos para conversaciones)

1. En el dashboard de Vercel, ve a tu proyecto → **Storage** → **Create Database** → **KV**
2. Vincula el KV store a tu proyecto
3. Las variables `KV_REST_API_URL` y `KV_REST_API_TOKEN` se agregan automáticamente

---

## 4. Variables de entorno

Copia `.env.example` a `.env` y completa todos los valores:

```bash
cp .env.example .env
```

| Variable | Descripción |
|----------|-------------|
| `WHATSAPP_TOKEN` | Token de acceso de Meta WhatsApp Business API |
| `PHONE_NUMBER_ID` | ID del número de teléfono de WhatsApp Business |
| `WEBHOOK_VERIFY_TOKEN` | Token secreto que tú inventas para verificar el webhook |
| `ANTHROPIC_API_KEY` | API key de Anthropic (console.anthropic.com) |
| `GOOGLE_SHEETS_ID` | ID del Google Sheet donde se registran los pedidos |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | JSON completo (minificado) de la cuenta de servicio de Google |
| `OWNER_PHONE_1` | Número del dueño 1 para notificaciones (ej: 56912345678) |
| `OWNER_PHONE_2` | Número del dueño 2 para notificaciones (ej: 56987654321) |

---

## 5. Desarrollo local

```bash
# Instalar dependencias
npm install

# Instalar Vercel CLI
npm install -g vercel

# Iniciar servidor local (simula el entorno de Vercel)
npm run dev
```

El servidor corre en `http://localhost:3000`. Para recibir webhooks de WhatsApp en local, usa [ngrok](https://ngrok.com):

```bash
ngrok http 3000
```

Luego configura la URL de ngrok en el webhook de Meta.

---

## 6. Deploy en Vercel

```bash
# Primera vez: vincular con Vercel
vercel

# Agregar variables de entorno en Vercel
vercel env add WHATSAPP_TOKEN
vercel env add PHONE_NUMBER_ID
# ... (repetir para cada variable)

# Deploy a producción
vercel --prod
```

O bien, sube el código a GitHub y conecta el repositorio en el dashboard de Vercel para deploys automáticos.

---

## 7. Probar el agente

Envía un mensaje de WhatsApp al número de tu cuenta Business. El agente responderá como **Verdurín** y podrá:

- Mostrar el catálogo de productos
- Armar pedidos con múltiples productos
- Calcular el costo de delivery automáticamente
- Registrar el pedido en Google Sheets al confirmar
- Notificar a los dueños por WhatsApp

---

## Estructura del proyecto

```
agente-verduras/
├── api/
│   └── webhook.js      # Handler principal del webhook (Express)
├── src/
│   ├── claude.js       # Integración con Anthropic API
│   ├── conversation.js # Gestión del historial de conversaciones (Vercel KV)
│   ├── products.js     # Catálogo de productos y system prompt
│   ├── sheets.js       # Registro de pedidos en Google Sheets
│   └── whatsapp.js     # Envío de mensajes por WhatsApp
├── .env.example
├── package.json
├── README.md
└── vercel.json
```
