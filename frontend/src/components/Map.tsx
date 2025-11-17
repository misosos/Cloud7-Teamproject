import { useEffect, useRef } from "react";

declare global {
  interface Window {
    kakao?: any;
  }
}

const KAKAO_KEY = import.meta.env.VITE_KAKAO_MAP_KEY;
console.log("🧪 ENV에서 읽은 KEY:", import.meta.env.VITE_KAKAO_MAP_KEY);
const KakaoMap = () => {
  const mapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    console.log("🗺 KakaoMap 마운트됨, KEY:", KAKAO_KEY);

    // 키 없으면 그냥 로그만 찍고 빠져나오게 (앱 안 죽게)
    if (!KAKAO_KEY) {
      console.error("❌ VITE_KAKAO_MAP_KEY 가 설정되어 있지 않습니다.");
      return;
    }

    const scriptId = "kakao-map-sdk";

    const initMap = () => {
      if (!mapRef.current) return;
      if (!window.kakao || !window.kakao.maps) {
        console.error("❌ window.kakao 또는 window.kakao.maps 가 없습니다.");
        return;
      }

      const { kakao } = window;

      const options = {
        center: new kakao.maps.LatLng(37.5665, 126.9780), // 서울
        level: 3,
      };

      const map = new kakao.maps.Map(mapRef.current, options);

      const marker = new kakao.maps.Marker({
        position: options.center,
      });

      marker.setMap(map);
      console.log("✅ 카카오맵 초기화 완료");
    };

    const existingScript = document.getElementById(
      scriptId
    ) as HTMLScriptElement | null;

    if (!existingScript) {
      console.log("📦 Kakao SDK 스크립트 동적 추가");

      const script = document.createElement("script");
      script.id = scriptId;
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&autoload=false`;
      script.async = true;

      script.onload = () => {
        console.log("📦 Kakao SDK 로드 완료");
        window.kakao?.maps?.load(initMap);
      };

      script.onerror = () => {
        console.error("❌ Kakao SDK 스크립트 로드 실패");
      };

      document.head.appendChild(script);
    } else {
      console.log("📦 Kakao SDK 이미 존재 → 바로 load");
      window.kakao?.maps?.load(initMap);
    }
  }, []);

  return (
    <div
      ref={mapRef}
      style={{
        width: "100%",
        maxWidth: "600px",
        height: "400px",
        backgroundColor: "#eee",
      }}
    >
      {/* JS 꺼져 있으면 이 텍스트만 보임 */}
    </div>
  );
};

export default KakaoMap;
