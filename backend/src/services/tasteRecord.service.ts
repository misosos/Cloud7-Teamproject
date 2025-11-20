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
function serialize(record: any) {
  return {
    id: record.id,
    title: record.title,
    desc: record.desc ?? '',
    content: record.content ?? '',
    category: record.category,
    tags: record.tagsJson ? (JSON.parse(record.tagsJson) as string[]) : [],
    thumb: record.thumb ?? null,
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
  }
) {
  const { title, caption, content, category, tags } = payload;

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
      thumb: null,
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