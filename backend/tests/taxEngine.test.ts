import { describe, it, expect } from 'bun:test';
import { calculatePricing } from '../src/services/taxEngine';

describe('Tax Engine & Pricing', () => {
  it('calculates intra-state 18% GST split into equal CGST and SGST for Karnataka', () => {
    const result = calculatePricing({
      baseAmount: 1000,
      gstRate: 18,
      customerState: 'Karnataka',
      customerCountry: 'India',
    });

    expect(result.taxType).toBe('intra_state');
    expect(result.cgst).toBe(90);
    expect(result.sgst).toBe(90);
    expect(result.igst).toBe(0);
    expect(result.totalAmount).toBe(1180);
    expect(result.razorpayFee).toBe(23.6);
    expect(result.razorpayTotal).toBe(1203.6);
    expect(result.availableMethods).toEqual(['upi', 'bank_transfer']);
  });

  it('calculates intra-state 5% GST split into 2.5% CGST and 2.5% SGST', () => {
    const result = calculatePricing({
      baseAmount: 2000,
      gstRate: 5,
      customerState: 'Karnataka',
      customerCountry: 'India',
    });

    expect(result.taxType).toBe('intra_state');
    expect(result.cgst).toBe(50);
    expect(result.sgst).toBe(50);
    expect(result.igst).toBe(0);
    expect(result.totalAmount).toBe(2100);
    expect(result.razorpayFee).toBe(42);
    expect(result.razorpayTotal).toBe(2142);
    expect(result.availableMethods).toEqual(['upi', 'bank_transfer']);
  });

  it('calculates inter-state 18% IGST when customer state differs from Karnataka', () => {
    const result = calculatePricing({
      baseAmount: 1000,
      gstRate: 18,
      customerState: 'Maharashtra',
      customerCountry: 'India',
    });

    expect(result.taxType).toBe('inter_state');
    expect(result.cgst).toBe(0);
    expect(result.sgst).toBe(0);
    expect(result.igst).toBe(180);
    expect(result.totalAmount).toBe(1180);
    expect(result.razorpayFee).toBe(23.6);
    expect(result.razorpayTotal).toBe(1203.6);
    expect(result.availableMethods).toEqual(['upi', 'bank_transfer']);
  });

  it('calculates zero-rated 0% GST for foreign customers and restricts to Razorpay only', () => {
    const result = calculatePricing({
      baseAmount: 1500,
      gstRate: 18,
      customerState: 'California',
      customerCountry: 'United States',
      isForeign: true,
    });

    expect(result.isForeign).toBe(true);
    expect(result.taxType).toBe('zero_rated_export');
    expect(result.cgst).toBe(0);
    expect(result.sgst).toBe(0);
    expect(result.igst).toBe(0);
    expect(result.totalAmount).toBe(1500);
    expect(result.razorpayFee).toBe(30);
    expect(result.razorpayTotal).toBe(1530);
    expect(result.availableMethods).toEqual(['razorpay']);
  });

  it('calculates free trial pricing with zero amounts', () => {
    const result = calculatePricing({
      baseAmount: 0,
      isFreeTrial: true,
      customerState: 'Karnataka',
      customerCountry: 'India',
    });

    expect(result.isFreeTrial).toBe(true);
    expect(result.taxType).toBe('free_trial');
    expect(result.totalAmount).toBe(0);
    expect(result.availableMethods).toEqual(['upi', 'bank_transfer']);
  });
});
