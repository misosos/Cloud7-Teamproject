// src/api/recommendations.ts
import type { Place, MappedCategory } from "./places";

export interface UnifiedRecommendationsResponse {
  ok: boolean;
  mode: "PERSONAL" | "GUILD";
  guildId?: number | null;
  guildName?: string;
  count: number;
  places: Place[];
  achieved: Place[];
  error?: string;
}

export async function getUnifiedRecommendations(): Promise<UnifiedRecommendationsResponse> {
  const res = await fetch("/api/recommendations/unified", {
    credentials: "include",
  });
  const data = await res.json();
  return data;
}
