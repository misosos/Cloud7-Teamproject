// 프론트 기준 타입 (백엔드 PlaceDTO랑 맞춰줌)
export type MappedCategory =
  | "영화"
  | "공연"
  | "전시"
  | "문화시설"
  | "관광명소"
  | "카페"
  | "식당"
  | "기타";

export interface Place {
  id: string;
  name: string;
  categoryName: string;
  categoryGroupCode: string;
  mappedCategory: MappedCategory;
  x: number;
  y: number;
  phone: string;
  roadAddress: string;
  address: string;
}

interface GetPlacesResponse {
  places: Place[];
}

export async function getNearbyPlaces(params: {
  x: number;
  y: number;
  radius?: number;
}): Promise<Place[]> {
  const search = new URLSearchParams();
  search.set("x", String(params.x));
  search.set("y", String(params.y));
  if (params.radius) {
    search.set("radius", String(params.radius));
  }

  const res = await fetch(`/api/places?${search.toString()}`, {
    credentials: "include", // 세션/쿠키 사용하는 경우 같이 전송
  });

  if (!res.ok) {
    throw new Error("장소 조회 실패");
  }

  const data: GetPlacesResponse = await res.json();
  return data.places;
}
