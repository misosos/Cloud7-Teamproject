// src/hooks/useLiveLocationTracker.ts
import { useEffect, useRef } from "react";

export function useLiveLocationTracker(options?: {
  enabled?: boolean;
  intervalMs?: number;
}) {
  const { enabled = true, intervalMs = 15_000 } = options ?? {};
  const lastSentRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled || !("geolocation" in navigator)) return;

    let watchId: number | null = null;

    watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const now = Date.now();

        // 너무 자주 보내지 않도록 최소 간격
        if (now - lastSentRef.current < intervalMs) return;
        lastSentRef.current = now;

        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        try {
          await fetch("/api/location/update", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({ lat, lng }),
          });
        } catch (err) {
          console.error("[useLiveLocationTracker] update error:", err);
        }
      },
      (err) => {
        console.warn("Geolocation error", err);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10_000,
        timeout: 20_000,
      },
    );

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [enabled, intervalMs]);
}
