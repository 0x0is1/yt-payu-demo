import { createHmac } from 'crypto';
import { getMerchantSettings } from './settingsService';

const RAZORPAY_API_BASE = 'https://api.razorpay.com/v1';

function getAuthHeader(): string {
  const config = getMerchantSettings();
  const keyId = config.razorpayKeyId || process.env.RAZORPAY_KEY_ID;
  const keySecret = config.razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials missing');
  }
  return 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
}

export interface CreateLinkParams {
  amountRupees: number;
  description: string;
  referenceId: string;
  callbackUrl?: string;
  customer: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  expireBy?: number;
}

export interface CreatedLinkResult {
  id: string;
  short_url: string;
  reference_id: string;
  status: string;
}

export async function createRazorpayPaymentLink(params: CreateLinkParams): Promise<CreatedLinkResult> {
  const payload: Record<string, any> = {
    amount: Math.round(params.amountRupees * 100),
    currency: 'INR',
    accept_partial: false,
    description: params.description,
    reference_id: params.referenceId,
    customer: {
      name: params.customer.name || 'Customer',
      email: params.customer.email || 'customer@example.com',
      ...(params.customer.contact ? { contact: params.customer.contact } : {}),
    },
    notify: { sms: false, email: false },
    notes: params.notes || {},
  };

  if (params.callbackUrl) {
    payload.callback_url = params.callbackUrl;
    payload.callback_method = 'get';
  }

  if (params.expireBy) {
    payload.expire_by = params.expireBy;
  }

  const res = await fetch(`${RAZORPAY_API_BASE}/payment_links`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.description || `Razorpay API error (${res.status})`);
  }

  return {
    id: data.id,
    short_url: data.short_url,
    reference_id: data.reference_id,
    status: data.status,
  };
}

export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const config = getMerchantSettings();
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || config.razorpayWebhookSecret;
  if (!secret) {
    throw new Error('RAZORPAY_WEBHOOK_SECRET missing');
  }
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  return expected === signature;
}
