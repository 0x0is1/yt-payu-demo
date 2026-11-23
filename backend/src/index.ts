import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { initializeDatabase } from './db/migrate';
import {
  generateLinkHandler,
  getNextOrderIdHandler,
  lookupOrderHandler,
  listOrdersHandler,
  retryOrderHandler,
} from './controllers/orderController';
import {
  calculatePricingHandler,
  submitCustomerDetailsHandler,
  resolveLocationHandler,
} from './controllers/checkoutController';
import {
  createRazorpayLinkHandler,
  markUpiPaidHandler,
  confirmUpiHandler,
  markBankPaidHandler,
  confirmBankHandler,
  activateFreeTrialHandler,
  verifyRazorpayPaymentHandler,
} from './controllers/paymentController';
import { handleRazorpayWebhook } from './controllers/webhookController';
import { adminWebSocketHandler } from './ws/adminGateway';
import { loginAdminHandler, getAdminMeHandler } from './controllers/adminAuthController';
import {
  getSettingsHandler,
  updateSettingsHandler,
  testRazorpayHandler,
  testGeocodingHandler,
} from './controllers/settingsController';
import { getMerchantSettings, loadMerchantSettings } from './services/settingsService';

await initializeDatabase();
await loadMerchantSettings();

const port = Number(process.env.PORT) || 4000;

export const app = new Elysia()
  .use(
    cors({
      origin: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-razorpay-signature', 'Accept'],
      credentials: true,
    })
  )
  .get('/api/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }))
  .get('/api/config', () => {
    const settings = getMerchantSettings();
    return {
      merchantUpiId: settings.merchantUpiId,
      merchantState: settings.merchantState,
      merchantName: settings.merchantName,
      bankAccountNumber: settings.bankAccountNumber,
      bankIfsc: settings.bankIfsc,
      bankAccountName: settings.bankAccountName,
      bankName: settings.bankName,
    };
  })
  .post('/api/admin/login', loginAdminHandler)
  .get('/api/admin/me', getAdminMeHandler)
  .get('/api/admin/settings', getSettingsHandler)
  .put('/api/admin/settings', updateSettingsHandler)
  .post('/api/admin/settings/test-razorpay', testRazorpayHandler)
  .post('/api/admin/settings/test-geocoding', testGeocodingHandler)
  .post('/api/orders/generate-link', generateLinkHandler)
  .get('/api/orders/next-id', getNextOrderIdHandler)
  .get('/api/orders/:identifierId', lookupOrderHandler)
  .get('/api/admin/orders', listOrdersHandler)
  .post('/api/admin/orders/:id/retry', retryOrderHandler)
  .post('/api/orders/:identifierId/calculate-pricing', calculatePricingHandler)
  .post('/api/orders/:identifierId/customer-details', submitCustomerDetailsHandler)
  .post('/api/location/resolve-state', resolveLocationHandler)
  .post('/api/orders/:identifierId/razorpay-link', createRazorpayLinkHandler)
  .post('/api/orders/:identifierId/verify-razorpay', verifyRazorpayPaymentHandler)
  .post('/api/orders/:identifierId/mark-upi-paid', markUpiPaidHandler)
  .patch('/api/admin/orders/:id/confirm-upi', confirmUpiHandler)
  .post('/api/orders/:identifierId/mark-bank-paid', markBankPaidHandler)
  .patch('/api/admin/orders/:id/confirm-bank', confirmBankHandler)
  .post('/api/orders/:identifierId/activate-trial', activateFreeTrialHandler)
  .post('/api/webhooks/razorpay', handleRazorpayWebhook);

if (!process.env.VERCEL) {
  app.ws('/ws/admin', adminWebSocketHandler);
}

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Backend service running on http://localhost:${port}`);
  });
}

export default app;
