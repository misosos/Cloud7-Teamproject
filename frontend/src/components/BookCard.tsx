// 기록 카드 컴포넌트
import { Link } from "react-router-dom";
import type { TasteRecordItem } from "@/types/type";
import BookFrame from "@/assets/ui/book.png";
import DefaultThumb from "@/assets/ui/thumb-placeholder.png";

// 백엔드 API 기본 URL (환경변수 없으면 로컬 기본값 사용)
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

// 썸네일 경로를 실제 브라우저에서 쓸 수 있는 URL로 변환하는 헬퍼
function resolveThumbSrc(thumb?: string | null) {
  // 1) 썸네일이 없으면: 기본 이미지 사용
  if (!thumb) {
    return DefaultThumb;
  }

  // 2) 이미 http로 시작하는 절대 URL이면 그대로 사용
  if (thumb.startsWith("http")) {
    return thumb;
  }

  // 3) `/uploads/...` 처럼 슬래시로 시작하는 상대 경로면 백엔드 도메인 붙이기
  if (thumb.startsWith("/")) {
    return `${API_BASE_URL}${thumb}`;
  }

  // 4) 그 외의 경우는 일단 원본 그대로 사용
  return thumb;
}

export default function BookCard({ item }: { item: TasteRecordItem }) {
  // 카드 전체를 클릭 시 상세페이지로 이동
  // 썸네일 URL을 가공(없으면 기본 이미지, 상대 경로면 API_BASE_URL prefix)
  const thumbSrc = resolveThumbSrc(item.thumb);

  return (
    <Link
      to={`/취향기록/${item.id}`}
      className="relative mx-auto w-full max-w-[210px] block"
    >
      {/**
        [책 프레임 + 내부 썸네일 레이어]
        - 바깥쪽 BookFrame 이미지는 '겉표지' 역할
        - 안쪽 썸네일은 '책 속 내용'처럼 보이도록 위치를 잡아줍니다.
      */}
      <div className="relative z-0 w-full">
        {/**
          [썸네일 이미지 영역]
          - absolute + 퍼센트(top/left/right/bottom)로 위치/비율을 제어합니다.
          - 이 값(16%, 17%, 15%, 48%)은 현재 BookFrame에 맞춘 자리잡기 수치입니다.
            필요 시 디자이너가 이 수치를 수정하여 썸네일 노출 범위를 미세 조정하면 됩니다.
        */}
        <div
          className="
            absolute
            top-[16%] left-[17%] right-[15%] bottom-[48%]
            z-0
            flex items-center justify-center
          "
        >
          {/**
            실제 썸네일 이미지
            - object-cover: 영역을 가득 채우되 비율을 유지하면서 잘 맞춥니다(필요 시 일부 크롭).
            - rounded-[4px]: 모서리를 약간 둥글게 처리하여 프레임과 자연스럽게 어울리게 합니다.
            - onError: 썸네일 로딩 실패 시 기본 이미지로 대체합니다.
          */}
          <img
            src={thumbSrc}
            alt={item.title}
            className="w-full h-full object-cover rounded-[4px]"
            onError={(e) => {
              // 이미지 로딩에 실패하면 기본 썸네일로 교체
              e.currentTarget.src = DefaultThumb;
            }}
          />
        </div>

        {/**
          [책 프레임 이미지]
          - 겉표지 역할을 하는 PNG 이미지입니다.
          - pointer-events-none / select-none: 장식 요소로 클릭/선택이 되지 않게 합니다.
          - texture-tone: 프로젝트 공용 시각효과(질감) 클래스 (테마에 따라 제거/수정 가능)
        */}
        <img
          src={BookFrame}
          alt="book frame"
          className="relative z-10 pointer-events-none select-none w-full h-auto texture-tone"
        />
      </div>

      {/**
        [제목 + 이동 화살표]
        - 제목은 좌측, 화살표(→)는 우측에 배치해 "상세로 이동" 느낌을 제공합니다.
        - '•' 점 표기는 리스트/배지 느낌을 주기 위한 간단한 장식입니다.
      */}
      <div className="mt-2 flex items-center justify-between">
        <div className="text-sm font-medium text-stone-800">• {item.title}</div>
        <span className="text-stone-400">→</span>
      </div>

      {/**
        [간단 설명]
        - 제목 아래에 한 줄 설명을 작게 표시합니다.
        - 필요 시 2~3줄로 늘리려면 CSS line-clamp 등을 적용할 수 있습니다.
      */}
      <p className="mt-1 text-xs text-stone-600">{item.desc}</p>
    </Link>
  );
}