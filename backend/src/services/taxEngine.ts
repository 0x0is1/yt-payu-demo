import { getMerchantSettings } from './settingsService';

export interface PricingInput {
  baseAmount: number;
  gstRate: number;
  customerState?: string | null;
  customerCountry?: string | null;
  isForeign?: boolean | null;
}

export interface PricingResult {
  baseAmount: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalAmount: number;
  razorpayFee: number;
  razorpayTotal: number;
  isForeign: boolean;
  taxType: 'intra_state' | 'inter_state' | 'zero_rated_export';
  availableMethods: ('razorpay' | 'manual_upi')[];
}

export function calculatePricing(input: PricingInput, merchantStateOverride?: string): PricingResult {
  const dynamicState = merchantStateOverride || getMerchantSettings().merchantState || process.env.MERCHANT_STATE || 'Karnataka';
  const merchantState = dynamicState.trim().toLowerCase();
  const customerState = (input.customerState || '').trim().toLowerCase();
  const customerCountry = (input.customerCountry || 'India').trim().toLowerCase();
  const isForeign = Boolean(input.isForeign || (customerCountry !== 'india' && customerCountry !== ''));

  const baseAmount = Math.round(input.baseAmount * 100) / 100;
  const gstRate = input.gstRate;

  if (isForeign) {
    const totalAmount = baseAmount;
    const razorpayFee = Math.round(totalAmount * 0.02 * 100) / 100;
    const razorpayTotal = Math.round((totalAmount + razorpayFee) * 100) / 100;

    return {
      baseAmount,
      gstRate: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      totalAmount,
      razorpayFee,
      razorpayTotal,
      isForeign: true,
      taxType: 'zero_rated_export',
      availableMethods: ['razorpay'],
    };
  }

  const isIntraState = customerState !== '' && customerState === merchantState;

  if (isIntraState) {
    const halfRate = gstRate / 2;
    const cgst = Math.round(((baseAmount * halfRate) / 100) * 100) / 100;
    const sgst = Math.round(((baseAmount * halfRate) / 100) * 100) / 100;
    const igst = 0;
    const totalAmount = Math.round((baseAmount + cgst + sgst) * 100) / 100;
    const razorpayFee = Math.round(totalAmount * 0.02 * 100) / 100;
    const razorpayTotal = Math.round((totalAmount + razorpayFee) * 100) / 100;

    return {
      baseAmount,
      gstRate,
      cgst,
      sgst,
      igst,
      totalAmount,
      razorpayFee,
      razorpayTotal,
      isForeign: false,
      taxType: 'intra_state',
      availableMethods: ['razorpay', 'manual_upi'],
    };
  }

  const cgst = 0;
  const sgst = 0;
  const igst = Math.round(((baseAmount * gstRate) / 100) * 100) / 100;
  const totalAmount = Math.round((baseAmount + igst) * 100) / 100;
  const razorpayFee = Math.round(totalAmount * 0.02 * 100) / 100;
  const razorpayTotal = Math.round((totalAmount + razorpayFee) * 100) / 100;

  return {
    baseAmount,
    gstRate,
    cgst,
    sgst,
    igst,
    totalAmount,
    razorpayFee,
    razorpayTotal,
    isForeign: false,
    taxType: 'inter_state',
    availableMethods: ['razorpay', 'manual_upi'],
  };
}
