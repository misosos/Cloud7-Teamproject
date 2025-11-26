// 카카오 로컬 API 응답 타입 (필요한 것만)
export interface KakaoPlaceDocument {
  id: string;
  place_name: string;
  category_name: string;
  category_group_code: string;
  x: string; // 경도
  y: string; // 위도
  phone: string;
  road_address_name: string;
  address_name: string;
}

export interface KakaoPlaceResponse {
  documents: KakaoPlaceDocument[];
}
