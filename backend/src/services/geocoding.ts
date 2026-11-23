export interface GeocodeResult {
  state: string;
  country: string;
  city?: string;
  isForeign: boolean;
  formattedAddress?: string;
}

export async function resolveCoordinatesToState(latitude: number, longitude: number): Promise<GeocodeResult> {
  const fallbackResult = getFallbackLocation(latitude, longitude);

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'PayUDemoApp/1.0 (contact@payudemo.internal)',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return fallbackResult;
    }

    const data: any = await res.json();
    const address = data?.address || {};
    const state = address.state || address.province || address.region || fallbackResult.state;
    const country = address.country || fallbackResult.country;
    const city = address.city || address.town || address.village || address.suburb || fallbackResult.city;
    const isForeign = country.trim().toLowerCase() !== 'india';

    return {
      state,
      country,
      city,
      isForeign,
      formattedAddress: data?.display_name || undefined,
    };
  } catch {
    return fallbackResult;
  }
}

function getFallbackLocation(lat: number, lon: number): GeocodeResult {
  if (lat >= 12.5 && lat <= 13.5 && lon >= 77.0 && lon <= 78.0) {
    return { state: 'Karnataka', country: 'India', city: 'Bengaluru', isForeign: false };
  }
  if (lat >= 18.5 && lat <= 19.5 && lon >= 72.5 && lon <= 73.5) {
    return { state: 'Maharashtra', country: 'India', city: 'Mumbai', isForeign: false };
  }
  if (lat >= 28.0 && lat <= 29.0 && lon >= 76.5 && lon <= 77.5) {
    return { state: 'Delhi', country: 'India', city: 'New Delhi', isForeign: false };
  }
  if (lat >= 12.8 && lat <= 13.3 && lon >= 80.0 && lon <= 80.4) {
    return { state: 'Tamil Nadu', country: 'India', city: 'Chennai', isForeign: false };
  }
  if (lat < 6.0 || lat > 38.0 || lon < 68.0 || lon > 98.0) {
    return { state: 'California', country: 'United States', city: 'San Francisco', isForeign: true };
  }
  return { state: 'Karnataka', country: 'India', city: 'Bengaluru', isForeign: false };
}
