// frontend/src/services/guildService.ts
import apiClient from "./apiClient";

/**
 * 내 연맹 상태 타입
 */
export type GuildMembershipStatus = "NONE" | "PENDING" | "APPROVED";

export type GuildDTO = {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[];
  rules: string | null;
  maxMembers: number;
  emblemUrl: string | null;
  ownerId: number;
  createdAt: string; // ISO 문자열
};

export type MyGuildStatusResponse = {
  status: GuildMembershipStatus;
  guild?: GuildDTO;
};

/** 공통 래핑 타입: { ok, data } */
type ApiEnvelope<T> = {
  ok: boolean;
  data: T;
};

/**  내 연맹 상태 조회 */
export async function fetchMyGuildStatus(): Promise<MyGuildStatusResponse> {
  const res = await apiClient.get<ApiEnvelope<MyGuildStatusResponse>>("/guilds/me");
  if (!res.ok) {
    const errorMessage = (res as any).message || (res as any).error || "연맹 상태 조회에 실패했습니다.";
    throw new Error(errorMessage);
  }
  return res.data;
}

/** 연맹 생성 시 사용할 payload 타입 */
export type CreateGuildPayload = {
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  rules?: string;
  maxMembers?: number;
  emblemUrl?: string;
};

/**  새 길드 생성 */
export async function createGuild(
  payload: CreateGuildPayload,
): Promise<GuildDTO> {
  const res = await apiClient.post<ApiEnvelope<GuildDTO>>("/guilds", payload);
  // apiClient는 HTTP 200-299 응답의 JSON payload를 그대로 반환
  // 백엔드는 { ok: true, data: GuildDTO } 형태로 응답
  if (!res || typeof res !== 'object') {
    throw new Error("예상치 못한 응답 형식입니다.");
  }
  // ok 필드가 false인 경우 (백엔드가 200 OK를 반환하면서 ok: false를 보낼 수 있음)
  if ('ok' in res && res.ok === false) {
    const errorMessage = (res as any).message || (res as any).error || "연맹 생성에 실패했습니다.";
    throw new Error(errorMessage);
  }
  // data 필드가 있는 경우 반환
  if ('data' in res && res.data) {
    return res.data;
  }
  // 예상치 못한 응답 형태
  console.error("예상치 못한 응답:", res);
  throw new Error("예상치 못한 응답 형식입니다.");
}

/**  길드 가입 */
export async function joinGuildBackend(
  guildId: number | string,
  message?: string,
): Promise<void> {
  const res = await apiClient.post<ApiEnvelope<unknown>>(
    `/guilds/${guildId}/join`,
    message ? { message } : {},
  );
  if (!res.ok) {
    throw new Error("길드 가입에 실패했습니다.");
  }
}

/**  길드 단일 조회 */
export async function getGuildById(
  guildId: number | string,
): Promise<GuildDTO> {
  const res = await apiClient.get<ApiEnvelope<GuildDTO>>(`/guilds/${guildId}`);
  if (!res.ok) {
    const errorMessage = (res as any).message || (res as any).error || "연맹 조회에 실패했습니다.";
    throw new Error(errorMessage);
  }
  return res.data;
}

/** 연맹 멤버 정보 타입 */
export type GuildMember = {
  id: number;
  userId: number;
  userName: string | null;
  userEmail: string;
  isOwner: boolean;
};

/**  연맹 멤버 목록 조회 */
export async function getGuildMembers(
  guildId: number | string,
): Promise<GuildMember[]> {
  const res = await apiClient.get<ApiEnvelope<GuildMember[]>>(
    `/guilds/${guildId}/members`,
  );
  if (!res.ok) {
    const errorMessage = (res as any).message || (res as any).error || "멤버 목록 조회에 실패했습니다.";
    throw new Error(errorMessage);
  }
  return res.data;
}

/** 연맹 랭킹 정보 타입 */
export type GuildRankingData = {
  myRank: {
    rank: number;
    userId: number;
    userName: string | null;
    userEmail: string;
    score: number;
  } | null;
  top3: {
    rank: number;
    userId: number;
    userName: string | null;
    userEmail: string;
    score: number;
  }[];
};

/** 연맹 랭킹 조회 */
export async function getGuildRanking(
  guildId: number | string,
): Promise<GuildRankingData> {
  const res = await apiClient.get<ApiEnvelope<GuildRankingData>>(
    `/guilds/${guildId}/ranking`,
  );
  if (!res.ok) {
    const errorMessage = (res as any).message || (res as any).error || "랭킹 조회에 실패했습니다.";
    throw new Error(errorMessage);
  }
  return res.data;
}

/* 길드 탈퇴 */
export async function leaveGuild(
  guildId: number | string,
): Promise<void> {
  const res = await apiClient.post<ApiEnvelope<unknown>>(
    `/guilds/${guildId}/leave`,
    {},
  );
  if (!res.ok) {
    throw new Error("연맹 탈퇴에 실패했습니다.");
  }
}

/** 가입 신청자 정보 타입 */
export type PendingMembership = {
  id: number;
  userId: number;
  userName: string | null;
  userEmail: string;
  message: string | null;
  createdAt: string;
};

/** 가입 신청 목록 조회 */
export async function fetchPendingMemberships(
  guildId: number | string,
): Promise<PendingMembership[]> {
  const res = await apiClient.get<ApiEnvelope<PendingMembership[]>>(
    `/guilds/${guildId}/pending`,
  );
  if (!res.ok) {
    const errorMessage = (res as any).message || (res as any).error || "가입 신청 목록 조회에 실패했습니다.";
    throw new Error(errorMessage);
  }
  return res.data;
}

/**  가입 신청 승인 */
export async function approveMembership(
  guildId: number | string,
  membershipId: number,
): Promise<void> {
  const res = await apiClient.post<ApiEnvelope<unknown>>(
    `/guilds/${guildId}/memberships/${membershipId}/approve`,
    {},
  );
  if (!res.ok) {
    throw new Error("가입 신청 승인에 실패했습니다.");
  }
}

/* 가입 신청 거절 */
export async function rejectMembership(
  guildId: number | string,
  membershipId: number,
): Promise<void> {
  const res = await apiClient.post<ApiEnvelope<unknown>>(
    `/guilds/${guildId}/memberships/${membershipId}/reject`,
    {},
  );
  if (!res.ok) {
    throw new Error("가입 신청 거절에 실패했습니다.");
  }
}

/** 연맹 업데이트 payload 타입 */
export type UpdateGuildPayload = {
  emblemUrl?: string;
};

/** 연맹 업데이트 (연맹장만 가능) */
export async function updateGuild(
  guildId: number | string,
  payload: UpdateGuildPayload,
): Promise<GuildDTO> {
  const res = await apiClient.patch<ApiEnvelope<GuildDTO>>(
    `/guilds/${guildId}`,
    payload,
  );
  if (!res.ok) {
    const errorMessage = (res as any).message || (res as any).error || "연맹 업데이트에 실패했습니다.";
    throw new Error(errorMessage);
  }
  return res.data;
}

/** 연맹 해체 */
export async function disbandGuild(
  guildId: number | string,
): Promise<void> {
  const res = await apiClient.post<ApiEnvelope<unknown>>(
    `/guilds/${guildId}/disband`,
    {},
  );
  if (!res.ok) {
    throw new Error("연맹 해체에 실패했습니다.");
  }
}
