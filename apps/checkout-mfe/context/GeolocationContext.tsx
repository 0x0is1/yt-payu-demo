'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type GeolocationStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable';

export interface LocationData {
  latitude?: number;
  longitude?: number;
  state: string;
  country: string;
  city?: string;
  isForeign: boolean;
}

interface GeolocationContextType {
  status: GeolocationStatus;
  location: LocationData | null;
  error: string | null;
  requestPermission: () => Promise<boolean>;
  manualSetForeign: (isForeign: boolean) => void;
}

const GeolocationContext = createContext<GeolocationContextType | undefined>(undefined);

export function GeolocationProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<GeolocationStatus>('idle');
  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resolveBackendLocation = useCallback(async (lat: number, lon: number): Promise<LocationData | null> => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
      const res = await fetch(`${backendUrl}/api/location/resolve-state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: lat, longitude: lon }),
      });
      const data = await res.json();
      if (data.success && data.location) {
        return {
          latitude: lat,
          longitude: lon,
          state: data.location.state || 'Karnataka',
          country: data.location.country || 'India',
          city: data.location.city,
          isForeign: Boolean(data.location.isForeign),
        };
      }
    } catch {
      return {
        latitude: lat,
        longitude: lon,
        state: 'Karnataka',
        country: 'India',
        isForeign: false,
      };
    }
    return null;
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!navigator || !navigator.geolocation) {
      setStatus('unavailable');
      setError('Geolocation is not supported by your browser.');
      return false;
    }

    setStatus('requesting');
    setError(null);

    return new Promise<boolean>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          const resolved = await resolveBackendLocation(lat, lon);
          if (resolved) {
            setLocation(resolved);
            setStatus('granted');
            resolve(true);
          } else {
            setStatus('denied');
            setError('Could not resolve your region from coordinates.');
            resolve(false);
          }
        },
        (err) => {
          setStatus('denied');
          if (err.code === err.PERMISSION_DENIED) {
            setError('Location access was denied. Location is required to calculate domestic tax compliance.');
          } else {
            setError(err.message || 'Unable to retrieve location coordinates.');
          }
          resolve(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  }, [resolveBackendLocation]);

  const manualSetForeign = (isForeign: boolean) => {
    if (isForeign) {
      setLocation((prev) => ({
        latitude: prev?.latitude,
        longitude: prev?.longitude,
        city: prev?.city,
        state: 'International',
        country: 'United States',
        isForeign: true,
      }));
    } else {
      setLocation((prev) => {
        if (!prev || prev.state === 'International') {
          return null;
        }
        return {
          ...prev,
          country: 'India',
          isForeign: false,
        };
      });
    }
  };

  useEffect(() => {
    if (navigator && navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((permissionStatus) => {
          if (permissionStatus.state === 'granted') {
            requestPermission();
          } else if (permissionStatus.state === 'denied') {
            setStatus('denied');
          }
        })
        .catch(() => {});
    }
  }, [requestPermission]);

  return (
    <GeolocationContext.Provider
      value={{
        status,
        location,
        error,
        requestPermission,
        manualSetForeign,
      }}
    >
      {children}
    </GeolocationContext.Provider>
  );
}

export function useGeolocationState() {
  const context = useContext(GeolocationContext);
  if (!context) {
    throw new Error('useGeolocationState must be used within GeolocationProvider');
  }
  return context;
}
