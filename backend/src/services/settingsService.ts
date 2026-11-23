import { db } from '../db/client';
import { merchantSettings } from '../db/schema';
import { eq } from 'drizzle-orm';
import { resolveCoordinatesToState } from './geocoding';

export interface MerchantConfig {
  merchantName: string;
  merchantUpiId: string;
  merchantState: string;
  razorpayKeyId: string;
  razorpayKeySecret: string;
  razorpayWebhookSecret: string;
  defaultGstRate: number;
  updatedAt: number;
}

export function getMerchantSettings(): MerchantConfig {
  const row = db
    .select()
    .from(merchantSettings)
    .where(eq(merchantSettings.id, 'default'))
    .get();

  if (!row) {
    return {
      merchantName: process.env.MERCHANT_NAME || 'PayU Merchant Store',
      merchantUpiId: process.env.MERCHANT_UPI_ID || 'payu-demo@okhdfcbank',
      merchantState: process.env.MERCHANT_STATE || 'Karnataka',
      razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_2xGYyaqTbp0HNw',
      razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || 'Bj7via42B9PX6GS38kQM6fVq',
      razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_webhook_secret_key',
      defaultGstRate: 18.0,
      updatedAt: Date.now(),
    };
  }

  return {
    merchantName: row.merchantName,
    merchantUpiId: row.merchantUpiId,
    merchantState: row.merchantState,
    razorpayKeyId: row.razorpayKeyId,
    razorpayKeySecret: row.razorpayKeySecret,
    razorpayWebhookSecret: row.razorpayWebhookSecret,
    defaultGstRate: row.defaultGstRate,
    updatedAt: row.updatedAt.getTime(),
  };
}

export function updateMerchantSettings(updates: Partial<MerchantConfig>): MerchantConfig {
  return db.transaction((tx) => {
    const current = tx
      .select()
      .from(merchantSettings)
      .where(eq(merchantSettings.id, 'default'))
      .get();

    const newName = updates.merchantName ?? current?.merchantName ?? 'PayU Merchant Store';
    const newUpiId = updates.merchantUpiId ?? current?.merchantUpiId ?? 'payu-demo@okhdfcbank';
    const newState = updates.merchantState ?? current?.merchantState ?? 'Karnataka';
    const newKeyId = updates.razorpayKeyId ?? current?.razorpayKeyId ?? 'rzp_test_2xGYyaqTbp0HNw';
    const newKeySecret = updates.razorpayKeySecret ?? current?.razorpayKeySecret ?? 'Bj7via42B9PX6GS38kQM6fVq';
    const newWebhookSecret = updates.razorpayWebhookSecret ?? current?.razorpayWebhookSecret ?? 'rzp_webhook_secret_key';
    const newGstRate = updates.defaultGstRate ?? current?.defaultGstRate ?? 18.0;
    const now = new Date();

    if (current) {
      tx.update(merchantSettings)
        .set({
          merchantName: newName,
          merchantUpiId: newUpiId,
          merchantState: newState,
          razorpayKeyId: newKeyId,
          razorpayKeySecret: newKeySecret,
          razorpayWebhookSecret: newWebhookSecret,
          defaultGstRate: newGstRate,
          updatedAt: now,
        })
        .where(eq(merchantSettings.id, 'default'))
        .run();
    } else {
      tx.insert(merchantSettings)
        .values({
          id: 'default',
          merchantName: newName,
          merchantUpiId: newUpiId,
          merchantState: newState,
          razorpayKeyId: newKeyId,
          razorpayKeySecret: newKeySecret,
          razorpayWebhookSecret: newWebhookSecret,
          defaultGstRate: newGstRate,
          updatedAt: now,
        })
        .run();
    }

    return {
      merchantName: newName,
      merchantUpiId: newUpiId,
      merchantState: newState,
      razorpayKeyId: newKeyId,
      razorpayKeySecret: newKeySecret,
      razorpayWebhookSecret: newWebhookSecret,
      defaultGstRate: newGstRate,
      updatedAt: now.getTime(),
    };
  });
}

export async function testRazorpayConnectivity(
  keyIdInput?: string,
  keySecretInput?: string
): Promise<{ success: boolean; message: string; details?: any }> {
  const current = getMerchantSettings();
  const keyId = (keyIdInput || current.razorpayKeyId).trim();
  const keySecret = (keySecretInput || current.razorpayKeySecret).trim();

  if (!keyId || !keySecret) {
    return {
      success: false,
      message: 'Razorpay Key ID and Secret are missing or incomplete',
    };
  }

  try {
    const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
    const start = Date.now();
    const response = await fetch('https://api.razorpay.com/v1/orders?count=1', {
      headers: {
        Authorization: authHeader,
      },
    });
    const latency = Date.now() - start;

    if (response.status === 200) {
      return {
        success: true,
        message: `Razorpay API connectivity verified successfully (${latency}ms)`,
        details: { keyId, latencyMs: latency, status: response.status },
      };
    }

    if (response.status === 401) {
      return {
        success: false,
        message: 'Razorpay API rejected credentials: Unauthorized (401)',
        details: { keyId, status: response.status },
      };
    }

    const errorBody = await response.text();
    return {
      success: false,
      message: `Razorpay API returned status ${response.status}`,
      details: { errorBody, status: response.status },
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to connect to Razorpay API: ${err.message}`,
    };
  }
}

export async function testGeocodingConnectivity(): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    const start = Date.now();
    const result = await resolveCoordinatesToState(12.9716, 77.5946);
    const latency = Date.now() - start;

    return {
      success: true,
      message: `Geocoding service reachable (${latency}ms): Resolved ${result.state}, ${result.country}`,
      details: { ...result, latencyMs: latency },
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Geocoding service error: ${err.message}`,
    };
  }
}
