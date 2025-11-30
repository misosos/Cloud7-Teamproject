import React, { useEffect, useState } from "react";
import PlacesList from "@/components/placesList";

const NearbyPlaceSection: React.FC = () => {
  const [lat, setLat] = useState<number | null>(null); // 위도
  const [lng, setLng] = useState<number | null>(null); // 경도
  const [locError, setLocError] = useState<string | null>(null);
  const [locLoading, setLocLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocError("브라우저에서 위치 정보를 지원하지 않아요.");
      setLocLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLat(latitude);
        setLng(longitude);
        setLocLoading(false);
      },
      (err) => {
        console.error("[NearbyTasteSection] 위치 가져오기 실패", err);
        setLocError("현재 위치를 가져올 수 없어요. 위치 권한을 확인해 주세요.");
        setLocLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  return (
    <section className="mt-8 rounded-2xl border border-[#E5DFCF] bg-white/60 px-6 py-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-stone-900">
            내 주변 가볼 곳
          </h2>
          <p className="mt-1 text-xs text-stone-500">
            현재 위치 기준 반경 3km 안에서, 놀기 좋은 장소를 모아봤어요.
          </p>
        </div>
      </div>

      {locLoading && (
        <p className="text-sm text-stone-600">내 위치를 불러오는 중...</p>
      )}

      {locError && (
        <p className="text-sm text-red-500">
          {locError}
        </p>
      )}

      {!locLoading && !locError && lat !== null && lng !== null && (
        <div className="mt-3">
          {/* ⚠️ PlacesList는 x=경도, y=위도 */}
          <PlacesList x={lng} y={lat} radius={2000} />
        </div>
      )}
    </section>
  );
};

export default NearbyPlaceSection;