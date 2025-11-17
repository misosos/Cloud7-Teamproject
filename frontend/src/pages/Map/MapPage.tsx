import KakaoMap from "@/components/Map"; // alias(@) 안 쓰면 "../components/Map" 도 가능

export default function MapPage() {
  console.log("✅ MapPage 렌더링됨!");
  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        alignItems: "center",
        justifyContent: "flex-start",
      }}
    >
      <h1>카카오맵 테스트 페이지</h1>
      <p>이 페이지는 우리 서비스의 위치/추천 기능을 실험하는 플레이그라운드입니다.</p>
      <KakaoMap />
    </div>
  );
}
