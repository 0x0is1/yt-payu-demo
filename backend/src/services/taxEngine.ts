import { getMerchantSettings } from './settingsService';

export interface PricingInput {
  baseAmount: number;
  gstRate?: number;
  customerState?: string | null;
  customerCountry?: string | null;
  isForeign?: boolean | null;
  isFreeTrial?: boolean | null;
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
  isFreeTrial: boolean;
  taxType: 'free_trial' | 'intra_state' | 'inter_state' | 'zero_rated_export';
  availableMethods: ('razorpay' | 'upi' | 'bank_transfer')[];
}

export function calculatePricing(input: PricingInput, merchantStateOverride?: string): PricingResult {
  const dynamicState = merchantStateOverride || getMerchantSettings().merchantState || process.env.MERCHANT_STATE || 'Karnataka';
  const merchantState = dynamicState.trim().toLowerCase();
  const customerState = (input.customerState || '').trim().toLowerCase();
  const customerCountry = (input.customerCountry || 'India').trim().toLowerCase();
  const isForeign = Boolean(input.isForeign || (customerCountry !== 'india' && customerCountry !== ''));
  const isFreeTrial = Boolean(input.isFreeTrial || input.baseAmount === 0);

  const baseAmount = isFreeTrial ? 0 : Math.round(input.baseAmount * 100) / 100;
  const standardGstRate = input.gstRate !== undefined ? input.gstRate : 18.0;

  if (isFreeTrial) {
    return {
      baseAmount: 0,
      gstRate: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      totalAmount: 0,
      razorpayFee: 0,
      razorpayTotal: 0,
      isForeign,
      isFreeTrial: true,
      taxType: 'free_trial',
      availableMethods: isForeign ? ['razorpay'] : ['upi', 'bank_transfer'],
    };
  }

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
      isFreeTrial: false,
      taxType: 'zero_rated_export',
      availableMethods: ['razorpay'],
    };
  }

  const isIntraState = customerState !== '' && customerState === merchantState;

  if (isIntraState) {
    const halfRate = standardGstRate / 2;
    const cgst = Math.round(((baseAmount * halfRate) / 100) * 100) / 100;
    const sgst = Math.round(((baseAmount * halfRate) / 100) * 100) / 100;
    const igst = 0;
    const totalAmount = Math.round((baseAmount + cgst + sgst) * 100) / 100;
    const razorpayFee = Math.round(totalAmount * 0.02 * 100) / 100;
    const razorpayTotal = Math.round((totalAmount + razorpayFee) * 100) / 100;

    return {
      baseAmount,
      gstRate: standardGstRate,
      cgst,
      sgst,
      igst,
      totalAmount,
      razorpayFee,
      razorpayTotal,
      isForeign: false,
      isFreeTrial: false,
      taxType: 'intra_state',
      availableMethods: ['upi', 'bank_transfer'],
    };
  }

  const cgst = 0;
  const sgst = 0;
  const igst = Math.round(((baseAmount * standardGstRate) / 100) * 100) / 100;
  const totalAmount = Math.round((baseAmount + igst) * 100) / 100;
  const razorpayFee = Math.round(totalAmount * 0.02 * 100) / 100;
  const razorpayTotal = Math.round((totalAmount + razorpayFee) * 100) / 100;

  return {
    baseAmount,
    gstRate: standardGstRate,
    cgst,
    sgst,
    igst,
    totalAmount,
    razorpayFee,
    razorpayTotal,
    isForeign: false,
    isFreeTrial: false,
    taxType: 'inter_state',
    availableMethods: ['upi', 'bank_transfer'],
  };
}
