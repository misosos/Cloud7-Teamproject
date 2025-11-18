// src/components/Map.tsx
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    kakao: any;
  }
}

const KakaoMap = () => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);   // kakao.maps.Map 저장용
  const polylineRef = useRef<any>(null);      // 이전 경로 지우기용
  const [loadingRoute, setLoadingRoute] = useState(false);

  // 🔹 카카오 스크립트 로드 + 지도 초기화
  useEffect(() => {
    const existingScript = document.getElementById("kakao-map-script");

    const initMap = () => {
      if (!mapRef.current) return;

      const kakao = window.kakao;
      const options = {
        center: new kakao.maps.LatLng(37.5665, 126.9780), // 서울 시청 근처
        level: 5,
      };

      const map = new kakao.maps.Map(mapRef.current, options);
      mapInstanceRef.current = map;

      // 테스트용 마커 하나
      new kakao.maps.Marker({
        position: options.center,
        map,
      });
    };

    if (!existingScript) {
      const script = document.createElement("script");
      script.id = "kakao-map-script";
      script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${
        import.meta.env.VITE_KAKAO_MAP_KEY
      }&autoload=false`;
      script.async = true;
      script.onload = () => {
        window.kakao.maps.load(initMap);
      };
      script.onerror = () => {
        console.error("❌ Kakao SDK 스크립트 로드 실패");
      };
      document.head.appendChild(script);
    } else {
      // 이미 스크립트 있으면 바로 로드
      window.kakao?.maps?.load(initMap);
    }
  }, []);

  // 🔹 백엔드(/api/directions/optimize) 호출 + Polyline 그리기
  const requestAndDrawRoute = async () => {
    if (!mapInstanceRef.current) return;
    setLoadingRoute(true);

    try {
      // 1) 테스트용 출발/도착 좌표 (lng,lat 순서!)
      //    - 시청 → 강남역 정도 예시
      const origin = "126.9784147,37.5666805";      // 서울 시청
      const destination = "127.0276210,37.4979420"; // 강남역
      const waypoints: string[] = [];               // 일단 경유지 없음

      const res = await fetch("http://localhost:8000/api/directions/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin,
          destination,
          waypoints,
          priority: "RECOMMEND",
        }),
      });

      if (!res.ok) {
        console.error("❌ 백엔드 응답 에러", await res.text());
        alert("경로 요청에 실패했습니다.");
        return;
      }

      const data = await res.json();
      console.log("🛰 Kakao Mobility 응답", data);

      // 2) Kakao Mobility 응답 → vertexes 배열에서 좌표 꺼내기
      const kakao = window.kakao;
      const map = mapInstanceRef.current;

      const routes = data.routes;
      if (!routes || routes.length === 0) {
        alert("경로 정보를 찾지 못했습니다.");
        return;
      }

      const firstRoute = routes[0];
      const firstSection = firstRoute.sections[0];

      const path: any[] = [];

      firstSection.roads.forEach((road: any) => {
        const v = road.vertexes; // [x1, y1, x2, y2, ...]  (x=lng, y=lat)

        for (let i = 0; i < v.length; i += 2) {
          const lng = v[i];
          const lat = v[i + 1];
          path.push(new kakao.maps.LatLng(lat, lng));
        }
      });

      // 3) 이전 경로가 있으면 제거
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
      }

      // 4) 새 Polyline 그리기
      const polyline = new kakao.maps.Polyline({
        map,
        path,
        strokeWeight: 5,
        strokeColor: "#3366FF",
        strokeOpacity: 0.9,
        strokeStyle: "solid",
      });

      polylineRef.current = polyline;

      // 5) 지도의 영역을 경로에 맞게 자동 조정
      const bounds = new kakao.maps.LatLngBounds();
      path.forEach((p) => bounds.extend(p));
      map.setBounds(bounds);
    } catch (err) {
      console.error("경로 요청/그리기 중 오류", err);
      alert("경로를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoadingRoute(false);
    }
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "800px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      <div
        ref={mapRef}
        style={{ width: "100%", height: "400px", borderRadius: 16, overflow: "hidden" }}
      />
      <button
        onClick={requestAndDrawRoute}
        disabled={loadingRoute}
        style={{
          padding: "8px 16px",
          borderRadius: 8,
          border: "none",
          cursor: "pointer",
          background: "#2f80ed",
          color: "#fff",
          fontWeight: 600,
        }}
      >
        {loadingRoute ? "경로 계산 중..." : "테스트 경로 불러오기"}
      </button>
    </div>
  );
};

export default KakaoMap;
