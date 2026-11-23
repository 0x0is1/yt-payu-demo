import { orderRepository } from '../repositories/orderRepository';
import { calculatePricing } from '../services/taxEngine';
import { resolveCoordinatesToState } from '../services/geocoding';
import { calculatePricingSchema, submitCustomerDetailsSchema, resolveLocationSchema } from '../validators/schemas';

export async function calculatePricingHandler({ params, body, set }: { params: { identifierId: string }; body: any; set: any }) {
  const parseResult = calculatePricingSchema.safeParse(body || {});
  if (!parseResult.success) {
    set.status = 400;
    return { success: false, errors: parseResult.error.flatten() };
  }

  const order = await orderRepository.findByIdentifier(params.identifierId);
  if (!order) {
    set.status = 404;
    return { success: false, error: 'Order not found' };
  }

  const data = parseResult.data;
  const pricing = calculatePricing({
    baseAmount: order.baseAmount,
    gstRate: order.gstRate,
    isFreeTrial: order.isFreeTrial,
    customerState: data.state || order.state,
    customerCountry: data.country || order.country,
    isForeign: data.isForeign,
  });

  await orderRepository.updatePricingAndLocation(params.identifierId, {
    cgst: pricing.cgst,
    sgst: pricing.sgst,
    igst: pricing.igst,
    totalAmount: pricing.totalAmount,
    razorpayFee: pricing.razorpayFee,
    state: data.state || order.state || undefined,
    country: data.country || order.country || undefined,
    isForeign: pricing.isForeign,
  });

  return {
    success: true,
    pricing,
  };
}

export async function submitCustomerDetailsHandler({ params, body, set }: { params: { identifierId: string }; body: any; set: any }) {
  const parseResult = submitCustomerDetailsSchema.safeParse(body);
  if (!parseResult.success) {
    set.status = 400;
    return { success: false, errors: parseResult.error.flatten() };
  }

  const order = await orderRepository.findByIdentifier(params.identifierId);
  if (!order) {
    set.status = 404;
    return { success: false, error: 'Order not found' };
  }

  const data = parseResult.data;
  const pricing = calculatePricing({
    baseAmount: order.baseAmount,
    gstRate: order.gstRate,
    isFreeTrial: order.isFreeTrial,
    customerState: data.state,
    customerCountry: data.country,
    isForeign: data.isForeign,
  });

  const updated = await orderRepository.updateCustomerDetails(params.identifierId, {
    customerName: data.customerName,
    customerEmail: data.customerEmail,
    customerPhone: data.customerPhone,
    addressLine: data.addressLine,
    city: data.city,
    state: data.state || 'Karnataka',
    country: data.country,
    isForeign: pricing.isForeign,
    nationality: data.nationality,
    latitude: data.latitude,
    longitude: data.longitude,
    cgst: pricing.cgst,
    sgst: pricing.sgst,
    igst: pricing.igst,
    totalAmount: pricing.totalAmount,
    razorpayFee: pricing.razorpayFee,
  });

  return {
    success: true,
    order: updated,
    pricing,
  };
}

export async function resolveLocationHandler({ body, set }: { body: any; set: any }) {
  const parseResult = resolveLocationSchema.safeParse(body);
  if (!parseResult.success) {
    set.status = 400;
    return { success: false, errors: parseResult.error.flatten() };
  }

  const { latitude, longitude } = parseResult.data;
  const result = await resolveCoordinatesToState(latitude, longitude);

  return {
    success: true,
    location: result,
  };
}
