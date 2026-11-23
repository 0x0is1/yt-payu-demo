import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { app } from '../src/index';
import { initializeDatabase } from '../src/db/migrate';
import { db } from '../src/db/client';
import { merchantSettings } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { updateMerchantSettings } from '../src/services/settingsService';

beforeAll(async () => {
  await initializeDatabase();
  await updateMerchantSettings({
    merchantName: 'PayU Merchant Store',
    merchantUpiId: 'payu-demo@okhdfcbank',
    merchantState: 'Karnataka',
    defaultGstRate: 18,
  });
});

afterAll(async () => {
  await updateMerchantSettings({
    merchantName: 'PayU Merchant Store',
    merchantUpiId: 'payu-demo@okhdfcbank',
    merchantState: 'Karnataka',
    defaultGstRate: 18,
  });
});

describe('Admin Authentication & Merchant Settings', () => {
  let authToken = '';

  it('rejects login with invalid credentials', async () => {
    const res = await app.handle(
      new Request('http://localhost:4000/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@payflow.internal',
          password: 'WrongPassword999',
        }),
      })
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Invalid email or password');
  });

  it('successfully logs in with default fixed admin credentials', async () => {
    const res = await app.handle(
      new Request('http://localhost:4000/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@payflow.internal',
          password: 'AdminPassword123!',
        }),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.token).toBeDefined();
    expect(typeof body.token).toBe('string');
    expect(body.user.role).toBe('admin');
    authToken = body.token;
  });

  it('verifies session with valid Bearer token', async () => {
    const res = await app.handle(
      new Request('http://localhost:4000/api/admin/me', {
        headers: { Authorization: `Bearer ${authToken}` },
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.user.email).toBe('admin@payflow.internal');
  });

  it('rejects verification with invalid token', async () => {
    const res = await app.handle(
      new Request('http://localhost:4000/api/admin/me', {
        headers: { Authorization: 'Bearer fake.invalid.token' },
      })
    );

    expect(res.status).toBe(401);
  });

  it('fetches merchant settings', async () => {
    const res = await app.handle(
      new Request('http://localhost:4000/api/admin/settings', {
        headers: { Authorization: `Bearer ${authToken}` },
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.settings.merchantState).toBeDefined();
    expect(body.settings.merchantUpiId).toBeDefined();
  });

  it('updates merchant settings within an ACID transaction', async () => {
    const res = await app.handle(
      new Request('http://localhost:4000/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          merchantName: 'Acme Test Superstore',
          merchantUpiId: 'acme.store@okhdfcbank',
          merchantState: 'Maharashtra',
          defaultGstRate: 5,
        }),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.settings.merchantName).toBe('Acme Test Superstore');
    expect(body.settings.merchantUpiId).toBe('acme.store@okhdfcbank');
    expect(body.settings.merchantState).toBe('Maharashtra');
    expect(body.settings.defaultGstRate).toBe(5);

    const saved = await db
      .select()
      .from(merchantSettings)
      .where(eq(merchantSettings.id, 'default'))
      .limit(1);
    expect(saved[0]?.merchantState).toBe('Maharashtra');
    expect(saved[0]?.merchantUpiId).toBe('acme.store@okhdfcbank');
  });

  it('tests Razorpay credentials endpoint', async () => {
    const res = await app.handle(
      new Request('http://localhost:4000/api/admin/settings/test-razorpay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          razorpayKeyId: 'rzp_test_2xGYyaqTbp0HNw',
          razorpayKeySecret: 'Bj7via42B9PX6GS38kQM6fVq',
        }),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.success).toBe('boolean');
    expect(typeof body.message).toBe('string');
  });

  it('tests geocoding connectivity endpoint', async () => {
    const res = await app.handle(
      new Request('http://localhost:4000/api/admin/settings/test-geocoding', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.success).toBe('boolean');
    expect(typeof body.message).toBe('string');
  });
});

describe('CORS Compliance & Preflight Verification', () => {
  it('handles OPTIONS preflight with CORS headers for MFE origins', async () => {
    const origins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://custom-domain.vercel.app',
    ];

    for (const origin of origins) {
      const res = await app.handle(
        new Request('http://localhost:4000/api/orders/generate-link', {
          method: 'OPTIONS',
          headers: {
            Origin: origin,
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Content-Type, Authorization',
          },
        })
      );

      expect([200, 204]).toContain(res.status);
      const allowOrigin = res.headers.get('access-control-allow-origin');
      expect(allowOrigin === '*' || allowOrigin === origin).toBe(true);
      expect(res.headers.get('access-control-allow-methods')).toBeDefined();
    }
  });

  it('includes CORS headers on actual GET and POST responses', async () => {
    const origin = 'http://localhost:3001';
    const res = await app.handle(
      new Request('http://localhost:4000/api/config', {
        method: 'GET',
        headers: { Origin: origin },
      })
    );

    expect(res.status).toBe(200);
    const allowOrigin = res.headers.get('access-control-allow-origin');
    expect(allowOrigin === '*' || allowOrigin === origin).toBe(true);
  });
});
