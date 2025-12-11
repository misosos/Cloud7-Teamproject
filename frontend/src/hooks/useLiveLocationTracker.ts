// src/hooks/useLiveLocationTracker.ts
import { useEffect } from "react";

interface Options {
  enabled: boolean;
  intervalMs?: number;
}

export function useLiveLocationTracker(options: Options) {
  const { enabled, intervalMs = 15_000 } = options;

  useEffect(() => {
    if (!enabled) return;
    if (!navigator.geolocation) {
      console.warn("[useLiveLocationTracker] geolocation not supported");
      return;
    }

    let timer: number | undefined;

    const sendLocation = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          fetch("/api/location/update", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lat: latitude, lng: longitude }),
          }).catch((err) => {
            console.error("[useLiveLocationTracker] update error", err);
          });
        },
        (err) => {
          console.warn("[useLiveLocationTracker] getCurrentPosition error", err);
        },
        {
          enableHighAccuracy: false,
          timeout: 20_000,
          maximumAge: 60_000,
        },
      );
    };

    // 최초 한 번
    sendLocation();
    // 주기적 호출
    timer = window.setInterval(sendLocation, intervalMs);

    const handleBeforeUnload = () => {
      navigator.sendBeacon("/api/location/clear");
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      if (timer) window.clearInterval(timer);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // SPA 내에서 떠날 때도 명시적 clear
      fetch("/api/location/clear", {
        method: "POST",
        credentials: "include",
      }).catch(() => {});
    };
  }, [enabled, intervalMs]);
}
