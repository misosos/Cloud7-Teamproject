import { KakaoPlaceDocument } from "../types/kakao";

export type MappedCategory =
  | "영화"
  | "공연"
  | "전시"
  | "문화시설"
  | "관광명소"
  | "카페"
  | "식당"
  | "기타";

export interface PlaceDTO {
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

/**
 * 카카오 category_group_code + category_name 기반 우리 서비스용 카테고리 매핑
 */
export function mapCategory(doc: KakaoPlaceDocument): MappedCategory {
  const group = doc.category_group_code;
  const name = doc.category_name ?? "";

  if (group === "CT1") {
    if (name.includes("영화")) return "영화";
    if (name.includes("공연") || name.includes("아트홀") || name.includes("뮤지컬")) return "공연";
    if (name.includes("전시") || name.includes("미술") || name.includes("갤러리")) return "전시";
    return "문화시설";
  }

  if (group === "AT4") {
    return "관광명소";
  }

  if (group === "CE7") {
    return "카페";
  }

  if (group === "FD6") {
    return "식당";
  }

  return "기타";
}

/**
 * Kakao 응답 → 프론트에 넘길 DTO로 변환
 */
export function toPlaceDTO(doc: KakaoPlaceDocument): PlaceDTO {
  return {
    id: doc.id,
    name: doc.place_name,
    categoryName: doc.category_name,
    categoryGroupCode: doc.category_group_code,
    mappedCategory: mapCategory(doc),
    x: Number(doc.x),
    y: Number(doc.y),
    phone: doc.phone,
    roadAddress: doc.road_address_name,
    address: doc.address_name,
  };
}
