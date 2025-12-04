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

        // 너무 자주 보내지 않도록
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
        // ----- 에러 처리 개선 -----
        if (err.code === 1) {
          // PERMISSION_DENIED
          console.warn(
            "[useLiveLocationTracker] 위치 권한 거부됨. 브라우저 또는 앱 설정에서 권한을 허용해 주세요."
          );
        } else if (err.code === 2) {
          // POSITION_UNAVAILABLE
          console.warn(
            "[useLiveLocationTracker] 위치 제공 불가. PC 환경/네트워크 문제일 수 있음."
          );
        } else if (err.code === 3) {
          // TIMEOUT
          console.debug(
            "[useLiveLocationTracker] 위치 응답 지연(TIMEOUT). 다시 시도합니다."
          );
        } else {
          console.warn("[useLiveLocationTracker] 알 수 없는 Geolocation 에러:", err);
        }
      },
      {
        // 고정 추천: PC/노트북에서 안정적인 옵션
        enableHighAccuracy: false,  // 너무 빡세면 실패 확률 매우 큼
        maximumAge: 60_000,         // 1분 이내 위치 캐싱 허용
        timeout: 60_000,            // TIMEOUT 거의 안 나게
        // 또는 timeout: Infinity 로도 가능
      }
    );

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [enabled, intervalMs]);
}
