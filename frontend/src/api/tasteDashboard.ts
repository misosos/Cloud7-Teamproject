// src/api/tasteDashboard.ts
export interface TasteDashboardResponse {
  ok: boolean;
  totalStays: number;
  counts: Record<string, number>;
  ratios: Record<string, number>;
}

export async function fetchTasteDashboard(): Promise<TasteDashboardResponse> {
  const res = await fetch("/taste-dashboard", {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("Failed to fetch taste dashboard");
  }
  return res.json();
}
