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

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export async function getNearbyPlaces(params: {
  x: number;
  y: number;
  radius?: number;
}): Promise<Place[]> {
  const url = new URL("/api/places", BASE_URL);
  url.searchParams.set("x", String(params.x));
  url.searchParams.set("y", String(params.y));
  if (params.radius) {
    url.searchParams.set("radius", String(params.radius));
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error("장소 조회 실패");
  }
  const data: GetPlacesResponse = await res.json();
  return data.places;
}
