import { useState, useCallback } from "react";

/**
 * Generic async data fetcher hook.
 * Usage: const { data, loading, error, execute } = useAsync(myServiceFn)
 */
export function useAsync(asyncFn, immediate = false) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error,   setError]   = useState(null);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await asyncFn(...args);
      setData(result);
      return result;
    } catch (err) {
      setError(err.message || "Something went wrong.");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [asyncFn]);

  return { data, loading, error, execute, setData };
}

/**
 * Geolocation hook — requests browser GPS position.
 */
export function useGeolocation() {
  const [position, setPosition] = useState(null);
  const [geoError, setGeoError] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      return;
    }
    setGeoLoading(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoLoading(false);
      },
      (err) => {
        setGeoError(
          err.code === 1 ? "Location permission denied. Please allow access to find nearby donors." :
          err.code === 2 ? "Location unavailable. Please try again." :
          "Location request timed out."
        );
        setGeoLoading(false);
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  return { position, geoError, geoLoading, requestLocation };
}
