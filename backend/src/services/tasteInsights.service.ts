// 취향 위자드 선택값을 기반으로 카테고리/태그 자동 추천
function getSuggestedCategoryAndTags(
  mood: string | null,
  companion: string | null,
  vibe: string | null
): { category?: string; tags: string[] } {
  const tags: string[] = [];

  // mood(목적/기분) 기반 태그
  if (mood === "힐링") {
    tags.push("#힐링", "#차분한");
  } else if (mood === "자극") {
    tags.push("#자극", "#새로운경험");
  } else if (mood === "공부") {
    tags.push("#공부", "#집중");
  } else if (mood === "추억") {
    tags.push("#추억", "#기록");
  }

  // companion(함께 한 사람) 기반 태그
  if (companion === "혼자") {
    tags.push("#혼자", "#나와의시간");
  } else if (companion === "친구") {
    tags.push("#친구", "#수다");
  } else if (companion === "연인") {
    tags.push("#연인", "#데이트");
  } else if (companion === "가족") {
    tags.push("#가족", "#소중한시간");
  }

  // vibe(분위기) 기반 태그
  if (vibe === "조용") {
    tags.push("#조용한", "#차분한공간");
  } else if (vibe === "붐빔") {
    tags.push("#핫플", "#붐비는곳");
  } else if (vibe === "트렌디") {
    tags.push("#트렌디", "#인스타감성");
  } else if (vibe === "클래식") {
    tags.push("#클래식", "#레트로");
  }

  // 아주 간단한 카테고리 추천 룰 (원하면 더 디테일하게 바꿔도 됨)
  let category: string | undefined;

  if (mood === "공부") {
    category = "도서";
  } else if (vibe === "트렌디" || vibe === "붐빔") {
    category = "카페";
  } else if (mood === "추억") {
    category = "사진";
  }

  return { category, tags };
}