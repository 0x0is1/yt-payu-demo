import { db } from '../db/client';
import { merchantSettings } from '../db/schema';
import { eq } from 'drizzle-orm';
import { resolveCoordinatesToState } from './geocoding';

export interface MerchantConfig {
  merchantName: string;
  merchantUpiId: string;
  bankAccountNumber: string;
  bankIfsc: string;
  bankAccountName: string;
  bankName: string;
  merchantState: string;
  razorpayKeyId: string;
  razorpayKeySecret: string;
  razorpayWebhookSecret: string;
  defaultGstRate: number;
  updatedAt: number;
}

let cachedSettings: MerchantConfig = {
  merchantName: process.env.MERCHANT_NAME || 'PayU Merchant Store',
  merchantUpiId: process.env.MERCHANT_UPI_ID || 'payu-demo@okhdfcbank',
  bankAccountNumber: process.env.BANK_ACCOUNT_NUMBER || '919876543210',
  bankIfsc: process.env.BANK_IFSC || 'HDFC0001234',
  bankAccountName: process.env.BANK_ACCOUNT_NAME || 'PayU Merchant Store Private Limited',
  bankName: process.env.BANK_NAME || 'HDFC Bank',
  merchantState: process.env.MERCHANT_STATE || 'Karnataka',
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_2xGYyaqTbp0HNw',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || 'Bj7via42B9PX6GS38kQM6fVq',
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_test_whsec_987654321',
  defaultGstRate: 18.0,
  updatedAt: Date.now(),
};

export async function loadMerchantSettings(): Promise<MerchantConfig> {
  try {
    const rows = await db
      .select()
      .from(merchantSettings)
      .where(eq(merchantSettings.id, 'default'))
      .limit(1);

    if (rows[0]) {
      cachedSettings = {
        merchantName: rows[0].merchantName,
        merchantUpiId: rows[0].merchantUpiId,
        bankAccountNumber: rows[0].bankAccountNumber,
        bankIfsc: rows[0].bankIfsc,
        bankAccountName: rows[0].bankAccountName,
        bankName: rows[0].bankName,
        merchantState: rows[0].merchantState,
        razorpayKeyId: rows[0].razorpayKeyId,
        razorpayKeySecret: rows[0].razorpayKeySecret,
        razorpayWebhookSecret: rows[0].razorpayWebhookSecret,
        defaultGstRate: rows[0].defaultGstRate,
        updatedAt: rows[0].updatedAt.getTime(),
      };
    }
  } catch {}

  return cachedSettings;
}

export function getMerchantSettings(): MerchantConfig {
  return cachedSettings;
}

export async function updateMerchantSettings(updates: Partial<MerchantConfig>): Promise<MerchantConfig> {
  const current = await loadMerchantSettings();

  const newName = updates.merchantName ?? current.merchantName;
  const newUpiId = updates.merchantUpiId ?? current.merchantUpiId;
  const newBankAccountNumber = updates.bankAccountNumber ?? current.bankAccountNumber;
  const newBankIfsc = updates.bankIfsc ?? current.bankIfsc;
  const newBankAccountName = updates.bankAccountName ?? current.bankAccountName;
  const newBankName = updates.bankName ?? current.bankName;
  const newState = updates.merchantState ?? current.merchantState;
  const newKeyId = updates.razorpayKeyId ?? current.razorpayKeyId;
  const newKeySecret = updates.razorpayKeySecret ?? current.razorpayKeySecret;
  const newWebhookSecret = updates.razorpayWebhookSecret ?? current.razorpayWebhookSecret;
  const newGstRate = updates.defaultGstRate ?? current.defaultGstRate;
  const now = new Date();

  await db.transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(merchantSettings)
      .where(eq(merchantSettings.id, 'default'))
      .limit(1);

    if (existing[0]) {
      await tx
        .update(merchantSettings)
        .set({
          merchantName: newName,
          merchantUpiId: newUpiId,
          bankAccountNumber: newBankAccountNumber,
          bankIfsc: newBankIfsc,
          bankAccountName: newBankAccountName,
          bankName: newBankName,
          merchantState: newState,
          razorpayKeyId: newKeyId,
          razorpayKeySecret: newKeySecret,
          razorpayWebhookSecret: newWebhookSecret,
          defaultGstRate: newGstRate,
          updatedAt: now,
        })
        .where(eq(merchantSettings.id, 'default'));
    } else {
      await tx.insert(merchantSettings).values({
        id: 'default',
        merchantName: newName,
        merchantUpiId: newUpiId,
        bankAccountNumber: newBankAccountNumber,
        bankIfsc: newBankIfsc,
        bankAccountName: newBankAccountName,
        bankName: newBankName,
        merchantState: newState,
        razorpayKeyId: newKeyId,
        razorpayKeySecret: newKeySecret,
        razorpayWebhookSecret: newWebhookSecret,
        defaultGstRate: newGstRate,
        updatedAt: now,
      });
    }
  });

  cachedSettings = {
    merchantName: newName,
    merchantUpiId: newUpiId,
    bankAccountNumber: newBankAccountNumber,
    bankIfsc: newBankIfsc,
    bankAccountName: newBankAccountName,
    bankName: newBankName,
    merchantState: newState,
    razorpayKeyId: newKeyId,
    razorpayKeySecret: newKeySecret,
    razorpayWebhookSecret: newWebhookSecret,
    defaultGstRate: newGstRate,
    updatedAt: now.getTime(),
  };

  return cachedSettings;
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
