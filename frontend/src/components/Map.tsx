import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    kakao: any;
  }
}

interface LatLng {
  lat: number;
  lng: number;
}

// ✅ 머무름 상태 타입
interface StayState {
  startLat: number;
  startLng: number;
  startTime: number; // ms
  lastTime: number;  // ms
  saved: boolean;    // 이 구간 이미 저장했는지
}

// ✅ 간단 거리 계산 (하버사인)
function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // m
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const STAY_RADIUS_M = 50;                 // 같은 장소로 보는 반경
const STAY_THRESHOLD_MS = 30 * 1000; // 10분 = 10 * 60 * 1000

const KakaoMap = () => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);       // kakao.maps.Map
  const polylineRef = useRef<any>(null);          // 경로 polyline
  const userMarkerRef = useRef<any>(null);        // 유저 위치 마커
  const watchIdRef = useRef<number | null>(null); // geolocation watch id
  const hasCenteredRef = useRef(false);           // 처음 한 번만 center 맞추기

  const [loadingRoute, setLoadingRoute] = useState(false);
  const [userPos, setUserPos] = useState<LatLng | null>(null);

  // ✅ 유저별 머무름 상태 (프론트 메모리)
  const stayStateRef = useRef<StayState | null>(null);


  // ✅ 머무름 저장 API 호출
  const saveStayToServer = async (
  lat: number,
  lng: number,
  startTime: number,
  endTime: number
) => {
  try {
    const res = await fetch("http://localhost:3000/api/stays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // ✅ 세션 쿠키 같이 전송
      body: JSON.stringify({
        lat,
        lng,
        startTime,
        endTime,
      }),
    });

    const data = await res.json();
    console.log("✅ stay 저장 응답:", data);

    if (!res.ok) {
      console.error("❌ stay 저장 실패", data);
    }
  } catch (e) {
    console.error("❌ stay 저장 중 에러", e);
  }
};


  // ✅ GPS 들어올 때마다 머무름 판단
  const handleStayLogic = (pos: LatLng, timestamp: number) => {
    let state = stayStateRef.current;

    // 1) 상태가 없으면 새로 시작
    if (!state) {
      stayStateRef.current = {
        startLat: pos.lat,
        startLng: pos.lng,
        startTime: timestamp,
        lastTime: timestamp,
        saved: false,
      };
      return;
    }

    // 2) 시작 지점과의 거리 계산
    const dist = distanceMeters(state.startLat, state.startLng, pos.lat, pos.lng);

    if (dist <= STAY_RADIUS_M) {
      // 같은 장소에 있는 중
      state.lastTime = timestamp;

      const duration = state.lastTime - state.startTime;

      if (!state.saved && duration >= STAY_THRESHOLD_MS) {
        // ✅ 10분 이상 머무름 → 서버에 저장
        state.saved = true;
        console.log("🎉 10분 머무름 감지! 서버에 저장 시도");
        saveStayToServer(state.startLat, state.startLng, state.startTime, state.lastTime);
      }
    } else {
      // 다른 장소로 이동했다고 판단 → 이전 머무름은 버리고 새로 시작
      stayStateRef.current = {
        startLat: pos.lat,
        startLng: pos.lng,
        startTime: timestamp,
        lastTime: timestamp,
        saved: false,
      };
    }
  };

  // 🔹 카카오 스크립트 로드 + 지도 초기화
  useEffect(() => {
    const existingScript = document.getElementById("kakao-map-script");

    const initMap = () => {
      if (!mapRef.current) return;
      const kakao = window.kakao;

      const defaultCenter = new kakao.maps.LatLng(37.5665, 126.9780); // 서울 시청
      const options = {
        center: defaultCenter,
        level: 5,
      };

      const map = new kakao.maps.Map(mapRef.current, options);
      mapInstanceRef.current = map;

      // 테스트용 기본 마커 (중심)
      new kakao.maps.Marker({
        position: defaultCenter,
        map,
      });

      // ✅ GPS 위치 추적 시작
      if ("geolocation" in navigator) {
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            const newPos: LatLng = { lat: latitude, lng: longitude };
            setUserPos(newPos);

            const userLatLng = new kakao.maps.LatLng(latitude, longitude);

            // 유저 마커가 없으면 새로 만들고, 있으면 위치만 업데이트
            if (!userMarkerRef.current) {
              userMarkerRef.current = new kakao.maps.Marker({
                position: userLatLng,
                map,
              });
            } else {
              userMarkerRef.current.setPosition(userLatLng);
            }

            // 처음 한 번만 유저 위치로 지도 센터 이동
            if (!hasCenteredRef.current) {
              map.setCenter(userLatLng);
              hasCenteredRef.current = true;
            }

            // ✅ 여기서 "머무름" 로직 호출
            // Geolocation timestamp 는 ms 단위
            handleStayLogic(newPos, pos.timestamp);
          },
          (err) => {
            console.error("📵 위치 권한/가져오기 실패", err);
            alert(
              `위치 가져오기 실패\ncode: ${err.code}\nmessage: ${err.message}`
            );
          },
          {
            enableHighAccuracy: true,
            maximumAge: 1000,
            timeout: 5000,
          }
        );
      } else {
        console.warn("이 브라우저는 geolocation을 지원하지 않습니다.");
      }
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
      window.kakao?.maps?.load(initMap);
    }

    // 언마운트 시 geolocation watch 해제
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // 🔹 백엔드(/api/places/optimize) 호출 + Polyline 그리기
  const requestAndDrawRoute = async () => {
    if (!mapInstanceRef.current) return;

    if (!userPos) {
      alert("아직 현재 위치를 가져오지 못했습니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    setLoadingRoute(true);

    try {
      const { lat, lng } = userPos;
      const origin = `${lng},${lat}`;
      const destination = "127.0276210,37.4979420"; // 강남역
      const waypoints: string[] = [];

      const res = await fetch("http://localhost:3000/api/places/optimize", {
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
          const vx = v[i];
          const vy = v[i + 1];
          path.push(new kakao.maps.LatLng(vy, vx));
        }
      });

      if (polylineRef.current) {
        polylineRef.current.setMap(null);
      }

      const polyline = new kakao.maps.Polyline({
        map,
        path,
        strokeWeight: 5,
        strokeColor: "#3366FF",
        strokeOpacity: 0.9,
        strokeStyle: "solid",
      });

      polylineRef.current = polyline;

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
        {loadingRoute ? "경로 계산 중..." : "현재 위치 기준 경로 불러오기"}
      </button>

      {userPos && (
        <div style={{ fontSize: 12, color: "#555" }}>
          현재 위치: lat {userPos.lat.toFixed(6)}, lng {userPos.lng.toFixed(6)}
        </div>
      )}
    </div>
  );
};

export default KakaoMap;
