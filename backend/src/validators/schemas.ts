import { z } from 'zod';

export const generateOrderSchema = z.object({
  orderId: z.string().trim().min(1).max(64).optional(),
  baseAmount: z.number().min(0),
  programDuration: z.string().trim().min(1).max(64).default('1 Month'),
  isFreeTrial: z.boolean().default(false),
  expiryMinutes: z.number().int().min(0).max(43200).default(1440),
  customerName: z.string().trim().max(128).optional(),
  customerEmail: z.string().trim().email().optional().or(z.literal('')),
  customerPhone: z.string().trim().max(20).optional(),
  addressLine: z.string().trim().max(256).optional(),
  city: z.string().trim().max(64).optional(),
  state: z.string().trim().max(64).optional(),
  country: z.string().trim().max(64).default('India'),
  nationality: z.string().trim().max(64).default('Indian'),
});

export const calculatePricingSchema = z.object({
  state: z.string().trim().optional(),
  country: z.string().trim().default('India'),
  isForeign: z.boolean().default(false),
});

export const submitCustomerDetailsSchema = z.object({
  customerName: z.string().trim().min(1),
  customerEmail: z.string().trim().email().optional().or(z.literal('')),
  customerPhone: z.string().trim().max(20).optional(),
  addressLine: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional().default('Karnataka'),
  country: z.string().trim().default('India'),
  isForeign: z.boolean().default(false),
  nationality: z.string().trim().default('Indian'),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
});

export const confirmUpiSchema = z.object({
  upiTransactionId: z.string().trim().min(4).max(128),
});

export const confirmBankSchema = z.object({
  bankReferenceId: z.string().trim().min(4).max(128),
});

export const markBankPaidSchema = z.object({
  bankReferenceId: z.string().trim().min(4).max(128).optional(),
});

export const resolveLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const adminLoginSchema = z.object({
  email: z.string().trim().min(3),
  password: z.string().min(6),
});

export const updateMerchantSettingsSchema = z.object({
  merchantName: z.string().trim().min(1).max(128).optional(),
  merchantUpiId: z.string().trim().min(3).max(128).optional(),
  bankAccountNumber: z.string().trim().min(4).max(64).optional(),
  bankIfsc: z.string().trim().min(4).max(32).optional(),
  bankAccountName: z.string().trim().min(1).max(128).optional(),
  bankName: z.string().trim().min(1).max(64).optional(),
  merchantState: z.string().trim().min(1).max(64).optional(),
  razorpayKeyId: z.string().trim().min(1).max(64).optional(),
  razorpayKeySecret: z.string().trim().min(1).max(64).optional(),
  razorpayWebhookSecret: z.string().trim().min(1).max(128).optional(),
  defaultGstRate: z.number().refine((val) => [18, 5, 0].includes(val), {
    message: 'defaultGstRate must be 18, 5, or 0',
  }).optional(),
});

export const testRazorpaySchema = z.object({
  razorpayKeyId: z.string().trim().optional(),
  razorpayKeySecret: z.string().trim().optional(),
});
