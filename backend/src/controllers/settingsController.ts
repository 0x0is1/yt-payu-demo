import { updateMerchantSettingsSchema, testRazorpaySchema } from '../validators/schemas';
import {
  getMerchantSettings,
  updateMerchantSettings,
  testRazorpayConnectivity,
  testGeocodingConnectivity,
} from '../services/settingsService';

export async function getSettingsHandler() {
  const settings = getMerchantSettings();
  return {
    success: true,
    settings,
  };
}

export async function updateSettingsHandler({ body, set }: { body: unknown; set: any }) {
  const parsed = updateMerchantSettingsSchema.safeParse(body);
  if (!parsed.success) {
    set.status = 400;
    return {
      error: 'Invalid settings payload',
      details: parsed.error.flatten().fieldErrors,
    };
  }

  const updated = await updateMerchantSettings(parsed.data);
  return {
    success: true,
    settings: updated,
  };
}

export async function testRazorpayHandler({ body, set }: { body: unknown; set: any }) {
  const parsed = testRazorpaySchema.safeParse(body || {});
  if (!parsed.success) {
    set.status = 400;
    return {
      error: 'Invalid payload',
      details: parsed.error.flatten().fieldErrors,
    };
  }

  const result = await testRazorpayConnectivity(
    parsed.data.razorpayKeyId,
    parsed.data.razorpayKeySecret
  );

  return result;
}

export async function testGeocodingHandler() {
  const result = await testGeocodingConnectivity();
  return result;
}

