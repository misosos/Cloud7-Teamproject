// backend/src/services/tasteRecord.service.ts
// ============================================================
// 취향 기록(TasteRecord) 도메인 서비스
// ------------------------------------------------------------
// - Prisma를 직접 사용하는 비즈니스 로직 모음
// - 라우터에서는 HTTP(req/res)만 처리하고,
//   이 파일은 "데이터 생성/조회 + 직렬화"만 담당합니다.
// ============================================================

import { PrismaClient } from '@prisma/client';

// 현재는 이 서비스 파일에서 Prisma 클라이언트를 직접 생성해서 사용
// (규모가 커지면 /lib/prisma.ts 같은 곳에서 싱글톤으로 관리해도 됨)
const prisma = new PrismaClient();

// ============================================================
// 헬퍼 함수: serialize
// ------------------------------------------------------------
// Prisma로부터 조회한 TasteRecord 레코드를
// 프론트엔드에서 사용하기 좋은 형태로 변환합니다.
//
// - desc, content:
//   - DB에서는 null일 수 있으므로, 프론트로 보낼 때는 빈 문자열로 통일
// - tagsJson:
//   - DB에는 string(JSON)으로 저장
//   - 프론트에는 string[]로 전달
// - createdAt:
//   - Date 객체 → ISO 문자열로 변환
// ============================================================
// 우리가 취향으로 추적할 카테고리 7개 (Stay.mappedCategory와 일치해야 함)
const TRACKED_CATEGORIES = [
  "영화",
  "공연",
  "전시",
  "문화시설",
  "관광명소",
  "카페",
  "식당",
] as const;

export type TrackedCategory = (typeof TRACKED_CATEGORIES)[number];

function serialize(record: any) {
  return {
    id: record.id,
    title: record.title,
    desc: record.desc ?? '',
    content: record.content ?? '',
    category: record.category,
    tags: record.tagsJson ? (JSON.parse(record.tagsJson) as string[]) : [],
    thumb: record.thumb ?? null,
    // 사용자가 기록한 날짜(없으면 createdAt 기반)
    recordDate: record.recordedAt
      ? record.recordedAt.toISOString()
      : record.createdAt.toISOString(),
    createdAt: record.createdAt.toISOString(),
  };
}

// ============================================================
// [서비스] 취향 기록 생성
// ------------------------------------------------------------
// - userId: 현재 로그인한 사용자 ID
// - payload: 라우터에서 검증 끝난 유효한 값들
// - 반환: 프론트에서 바로 쓰기 좋은 직렬화된 객체
// ============================================================
export async function createTasteRecord(
  userId: number,
  payload: {
    title: string;
    caption?: string;
    content?: string;
    category: string;
    tags?: string[];
    thumb?: string | null; // 썸네일 이미지 URL (없을 수 있음)
    recordDate?: string | Date; // 사용자가 선택한 기록 날짜(선택)
  }
) {
  const { title, caption, content, category, tags, thumb, recordDate } = payload;

  const created = await prisma.tasteRecord.create({
    data: {
      userId,
      title,
      desc: caption ?? null, // 프론트 caption → DB desc
      content: content ?? null,
      category,
      tagsJson:
        tags && Array.isArray(tags) && tags.length > 0
          ? JSON.stringify(tags)
          : null,
      // Prisma의 필드명은 recordedAt 이므로 여기서 매핑해줌
      recordedAt:
        recordDate
          ? recordDate instanceof Date
            ? recordDate
            : new Date(recordDate)
          : undefined,
      thumb: thumb ?? null, // 전달된 썸네일 URL 저장 (없으면 null)
    },
  });

  return serialize(created);
}

// ============================================================
// [서비스] 사용자별 취향 기록 목록 조회
// ------------------------------------------------------------
// - userId 기준으로만 자신의 데이터 조회
// - createdAt 기준 내림차순 정렬
// ============================================================
export async function getTasteRecordsByUser(userId: number) {
  const records = await prisma.tasteRecord.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  return records.map(serialize);
}

// ============================================================
// [서비스] 사용자별 특정 취향 기록 단건 조회
// ------------------------------------------------------------
// - id + userId 둘 다 조건에 넣어서,
//   다른 사람 기록을 가져오는 일이 없도록 방지
// - 찾으면 직렬화된 객체, 없으면 null 반환
// ============================================================
export async function getTasteRecordByIdForUser(
  userId: number,
  id: string
) {
  const record = await prisma.tasteRecord.findFirst({
    where: {
      id,
      userId,
    },
  });

  if (!record) return null;

  return serialize(record);
}

// ============================================================
// [서비스] 사용자별 특정 취향 기록 삭제
// ------------------------------------------------------------
// - id + userId 둘 다 조건에 넣어서,
//   다른 사람 기록을 삭제하는 일이 없도록 방지
// - 실제로 삭제된 row 수를 기반으로 boolean을 반환합니다.
//   (라우터에서 deleted === false인 경우 404 등으로 처리할 수 있습니다.)
// ============================================================
export async function deleteTasteRecord(
  userId: number,
  id: string
) {
  const result = await prisma.tasteRecord.deleteMany({
    where: {
      id,
      userId,
    },
  });

  // 1개 이상 삭제되었다면 true, 아니면 false 반환
  return result.count > 0;
}

// ============================================================
// [타입] 취향 인사이트 구조
// ------------------------------------------------------------
// - totalCount   : 전체 기록 개수
// - byCategory   : 카테고리별 기록 개수 (단순 집계)
// - byTag        : 태그별 기록 개수 (단순 집계)
// - byMonth      : 연-월(YYYY-MM) 기준 기록 개수
// - recentRecords: 최근 기록 10개 (카드용)
// - categoryStats: 카테고리별 비율 포함 상세 통계
// - tagStats     : 태그별 비율 포함 상세 통계
// ============================================================
export type TasteRecordDTO = ReturnType<typeof serialize>;

export interface CategoryStat {
  category: string;
  count: number;
  ratio: number; // 전체 대비 비율 (0~1)
}

export interface TagStat {
  tag: string;
  count: number;
  ratio: number; // 전체 대비 비율 (0~1)
}

export interface TasteRecordInsights {
  totalCount: number;
  byCategory: { category: string; count: number }[];
  byTag: { tag: string; count: number }[];
  byMonth: { month: string; count: number }[];
  recentRecords: TasteRecordDTO[];
  categoryStats: CategoryStat[];
  tagStats: TagStat[];
}

// ============================================================
// [서비스] 취향 인사이트 조회
// ------------------------------------------------------------
// - 한 번에 사용자 전체 기록을 가져와 메모리에서 집계
// - 규모가 커지면 groupBy / rawQuery 등으로 최적화 가능
// - 여기서는 대시보드용 기본 통계를 제공
// ============================================================
export async function getTasteRecordInsightsByUser(
  userId: number
): Promise<TasteRecordInsights> {
  // 1) 해당 사용자의 모든 기록 조회
  const records = await prisma.tasteRecord.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });

  const serialized = records.map(serialize);

  const totalCount = serialized.length;

  // 2) 집계용 맵 준비
  const categoryMap = new Map<string, number>();
  const tagMap = new Map<string, number>();
  const monthMap = new Map<string, number>();

  for (const record of serialized) {
    // 2-1) 카테고리별 카운트
    categoryMap.set(
      record.category,
      (categoryMap.get(record.category) ?? 0) + 1
    );

    // 2-2) 태그별 카운트
    if (record.tags && record.tags.length > 0) {
      for (const tag of record.tags) {
        tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1);
      }
    }

    // 2-3) 연-월(YYYY-MM) 기준 카운트
    const baseDate = record.recordDate ?? record.createdAt;
    const d = new Date(baseDate);

    if (!Number.isNaN(d.getTime())) {
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        '0'
      )}`;
      monthMap.set(monthKey, (monthMap.get(monthKey) ?? 0) + 1);
    }
  }

  // 3) 맵 → 정렬된 배열로 변환
  const byCategory = Array.from(categoryMap.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count); // 많이 기록된 순으로 정렬

  const byTag = Array.from(tagMap.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count); // 많이 사용된 태그 순으로 정렬

  const byMonth = Array.from(monthMap.entries())
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month)); // 오래된 달 → 최근 달 순

  const categoryStats: CategoryStat[] = Array.from(categoryMap.entries())
    .map(([category, count]) => ({
      category,
      count,
      ratio: totalCount > 0 ? count / totalCount : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const tagStats: TagStat[] = Array.from(tagMap.entries())
    .map(([tag, count]) => ({
      tag,
      count,
      ratio: totalCount > 0 ? count / totalCount : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // 4) 최근 기록 10개 (recordDate 기준 내림차순)
  const recentRecords = serialized
    .slice()
    .sort((a, b) => b.recordDate.localeCompare(a.recordDate))
    .slice(0, 10);

    
  return {
    totalCount,
    byCategory,
    byTag,
    byMonth,
    recentRecords,
    categoryStats,
    tagStats,
  };
  
}

// ============================================================
// [서비스] Stay 기반 취향 대시보드 계산 + TasteRecord(DASHBOARD)로 스냅샷 저장
// ------------------------------------------------------------
// - Stay.mappedCategory를 groupBy 해서 비율(0~1) 계산
// - TasteRecord 테이블에 category='DASHBOARD'인 레코드를 upsert
// - 프론트에서는 weights를 그대로 사용해 퍼센트 막대 등으로 활용 가능
// ============================================================
export interface TasteDashboardResult {
  totalStays: number;
  weights: Record<TrackedCategory, number>;
  // 원하면 프론트에서 바로 써먹을 수 있게, 직렬화된 TasteRecord도 함께 반환
  dashboardRecord: TasteRecordDTO | null;
}

export async function buildTasteDashboardFromStays(
  userId: number,
): Promise<TasteDashboardResult> {
  // Stay에서 카테고리별 개수 집계
  const grouped = await prisma.stay.groupBy({
    by: ["mappedCategory"],
    where: {
      userId,
      mappedCategory: { not: null },
    },
    _count: { _all: true },
  });

  const total = grouped.reduce((sum, g) => sum + g._count._all, 0);

  // 기본 0으로 채운 weight 맵
  const weights: Record<TrackedCategory, number> = {
    영화: 0,
    공연: 0,
    전시: 0,
    문화시설: 0,
    관광명소: 0,
    카페: 0,
    식당: 0,
  };

  if (total > 0) {
    TRACKED_CATEGORIES.forEach((cat) => {
      const row = grouped.find((g) => g.mappedCategory === cat);
      const count = row?._count._all ?? 0;
      weights[cat] = count / total; // 비율 (0~1)
    });
  }

  // 👇 TasteRecord에 스냅샷으로 저장 (category='DASHBOARD')
  const tagsJson = JSON.stringify(weights);

  let dashboardRecord: TasteRecordDTO | null = null;

  try {
    const raw = await prisma.tasteRecord.upsert({
      where: {
        userId_category: {
          userId,
          category: "DASHBOARD",
        },
      },
      create: {
        userId,
        title: "나의 취향 대시보드",
        desc: "Stay 기록을 기반으로 계산된 문화 취향 비율입니다.",
        content: null,
        recordedAt: new Date(),
        category: "DASHBOARD",
        tagsJson,
        thumb: null,
      },
      update: {
        desc: "Stay 기록을 기반으로 다시 계산된 문화 취향 비율입니다.",
        recordedAt: new Date(),
        tagsJson,
      },
    });

    dashboardRecord = serialize(raw);
  } catch (e) {
    console.error("[TasteDashboard] upsert 실패", e);
  }

  return {
    totalStays: total,
    weights,
    dashboardRecord,
  };
}
