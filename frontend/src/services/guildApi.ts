// frontend/src/services/guildApi.ts

import apiClient from "./apiClient";
import type { OfficialDexItem, TasteRecordItem } from "@/types/type";
import type { GuildDTO as BackendGuildDTO } from "./guildService";

/**
 * 길드 태그(카테고리 느낌)
 */
export type GuildTag = string;

/** 길드 모집 상태 */
export type GuildStatus = "모집 중" | "모집 마감";

/** 탐색 리스트에서 한 줄로 보이는 길드 요약 정보 */
export type GuildListItem = {
  id: string;
  name: string;
  intro: string;
  tags: GuildTag[];
  currentMembers: number;
  maxMembers: number;
  status: GuildStatus;
};

/** 상세 화면용 길드 기본 정보 */
export type GuildBasic = {
  id: string;
  name: string;
  description: string;
  intro: string;
  rules: string;
  stats: {
    totalDex: number;
    thisMonthDex: number;
    ongoingDex: number;
    completedDex: number;
  };
};

/** 길드 멤버(탐험가) 정보 */
export type GuildExplorer = {
  id: number;
  name: string;
  intro: string;
};

/** 길드 랭킹 정보 */
export type GuildRanking = {
  myRank: { rank: number; name: string; score: number };
  top4: { rank: number; name: string; score: number }[];
};

/** 길드 상세 페이지 전체 데이터 구조 */
export type GuildDetailData = {
  guild: GuildBasic;
  explorers: GuildExplorer[];
  guildDex: OfficialDexItem[];
  inProgressBooks: TasteRecordItem[];
  completedBooks: TasteRecordItem[];
  ranking: GuildRanking;
};



export const FILTER_TAGS: (GuildTag | "전체")[] = [
  "전체",
  "야간 러닝",
  "운동",
  "보드게임",
  "오프라인",
  "모임",
  "사진",
  "야경",
  "독서",
  "카페",
  "조용한",
];



type BackendGuildListItemDTO = BackendGuildDTO & {
  memberCount: number;
};

// 🧪 "리스트 조회" API

/**
 * 탐험가 연맹 리스트 조회
 */
export async function fetchGuildList(): Promise<GuildListItem[]> {
  const res = await apiClient.get<{
    ok: boolean;
    data: BackendGuildListItemDTO[];
  }>("/guilds");

  // axios 기본 형태: res.data = { ok, data }
  const list = res.data;

  return list.map((g) => ({
    id: String(g.id),
    name: g.name,
    intro: g.description ?? "",
    //  백엔드 tags 문자열 배열  프론트 태그로 그대로 사용
    tags: (g.tags ?? []) as GuildTag[],
    // 멤버 수: 백엔드에서 계산된 memberCount 사용
    currentMembers: g.memberCount ?? 0,
    // 일단 최대 인원은 임시 값 
    maxMembers: g.maxMembers ?? 20,
    status: "모집 중",
  }));
}



import { getGuildById, getGuildMembers, getGuildRanking } from "./guildService";

/**
 * 특정 길드 상세 조회
 * @param guildId 길드 ID (문자열)
 * @returns GuildDetailData 또는 null (없는 경우)
 */
export async function fetchGuildDetail(
  guildId: string,
): Promise<GuildDetailData | null> {
  try {
    // 백엔드에서 기본 길드 정보 가져오기
    const guildData = await getGuildById(guildId);
    
    if (!guildData) {
      return null;
    }

    // 멤버 목록과 랭킹 정보 가져오기
    const [members, ranking] = await Promise.all([
      getGuildMembers(guildId).catch(() => []),
      getGuildRanking(guildId).catch(() => ({
        myRank: null,
        top3: [],
      })),
    ]);

    
    const detailData: GuildDetailData = {
      guild: {
        id: String(guildData.id),
        name: guildData.name,
        description: guildData.description || "",
        intro: guildData.description || "연맹 소개가 없습니다.",
        rules: guildData.rules || "연맹 규칙이 설정되지 않았습니다.",
        stats: {
          totalDex: 0,
          thisMonthDex: 0,
          ongoingDex: 0,
          completedDex: 0,
        },
      },
      explorers: members.map((m) => ({
        id: m.userId,
        name: m.userName || m.userEmail,
        intro: m.isOwner ? "연맹장" : "연맹원",
      })),
      guildDex: [], //  백엔드에서 연맹 도감 가져오기
      inProgressBooks: [], // 백엔드에서 진행 중인 도감 가져오기
      completedBooks: [], // 백엔드에서 완료된 도감 가져오기
      ranking: {
        myRank: ranking.myRank
          ? {
              rank: ranking.myRank.rank,
              name: ranking.myRank.userName || ranking.myRank.userEmail,
              score: ranking.myRank.score,
            }
          : { rank: 0, name: "", score: 0 },
        top4: ranking.top3.map((r) => ({
          rank: r.rank,
          name: r.userName || r.userEmail,
          score: r.score,
        })),
      },
    };

    return detailData;
  } catch (err) {
    console.error("길드 상세 조회 실패:", err);
    return null;
  }
}
