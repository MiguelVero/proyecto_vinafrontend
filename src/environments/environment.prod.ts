// frontend_dsi6/src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://backendvina-production.up.railway.app/api',
  // ✅ Para producción, la URL debe apuntar a tu dominio real
  yapeWebhookUrl: 'https://backendvina-production.up.railway.app/api/yape/webhook',
  logLevel: 'error',
  apiUrlPHP: 'https://sunatphp-production.up.railway.app'
};