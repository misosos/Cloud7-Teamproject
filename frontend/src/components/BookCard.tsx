// 기록 카드 컴포넌트: 기록 목록/슬라이더/상세로 이동 시 사용
import { Link } from "react-router-dom";
import type { RecordItem } from "@/types/type";
import BookFrame from "@/assets/ui/book.png";

/**
 * BookCard (책 모양 기록 카드)
 * ─────────────────────────────────────────────────────────
 * 목적: 한 개의 기록(RecordItem)을 "책" 프레임 안에 썸네일과 함께 보여주는 카드입니다.
 * 사용처: 기록 목록/슬라이더 등에서 아이템을 보여주고, 클릭하면 상세로 이동합니다.
 *
 * ▸ 이 컴포넌트가 받는 데이터(Props)
 *   - item: RecordItem
 *     • item.id    : 상세 페이지 이동에 사용하는 고유 ID (링크 경로에 사용)
 *     • item.title : 카드 하단에 표시되는 제목(캡션)
 *     • item.thumb : 책 안쪽에 들어갈 썸네일 이미지(콘텐츠 미리보기)
 *     • item.desc  : 한 줄 설명(부가 설명)
 *
 * ▸ 디자이너/기획자 참고
 *   - 책 안쪽 썸네일의 위치/크기는 아래 absolute 스타일의 퍼센트 값(top/left/right/bottom)
 *     으로 조정합니다. BookFrame(겉표지) 이미지에 맞춰 수치를 미세 조정 가능합니다.
 *   - 카드 전체 영역이 클릭 가능한 링크입니다. 별도의 버튼 없이도 상세 페이지로 이동합니다.
 */
export default function BookCard({ item }: { item: RecordItem }) {
  // 카드 전체를 클릭 시 상세페이지로 이동
  return (
    <Link
      to={`/취향기록/${item.id}`}
      className="relative mx-auto w-full max-w-[210px] block"
    >
      {/*
        [책 프레임 + 내부 썸네일 레이어]
        - 바깥쪽 BookFrame 이미지는 '겉표지' 역할
        - 안쪽 썸네일은 '책 속 내용'처럼 보이도록 위치를 잡아줍니다.
      */}
      <div className="relative w-full">
        {/*
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
          {/*
            실제 썸네일 이미지
            - object-cover: 영역을 가득 채우되 비율을 유지하면서 잘 맞춥니다(필요 시 일부 크롭).
            - rounded-[4px]: 모서리를 약간 둥글게 처리하여 프레임과 자연스럽게 어울리게 합니다.
          */}
          <img
            src={item.thumb}
            alt={item.title}
            className="w-full h-full object-cover rounded-[4px]"
          />
        </div>

        {/*
          [책 프레임 이미지]
          - 겉표지 역할을 하는 PNG 이미지입니다.
          - pointer-events-none / select-none: 장식 요소로 클릭/선택이 되지 않게 합니다.
          - texture-tone: 프로젝트 공용 시각효과(질감) 클래스 (테마에 따라 제거/수정 가능)
        */}
        <img
          src={BookFrame}
          alt="book frame"
          className="pointer-events-none select-none w-full h-auto texture-tone"
        />
      </div>

      {/*
        [제목 + 이동 화살표]
        - 제목은 좌측, 화살표(→)는 우측에 배치해 "상세로 이동" 느낌을 제공합니다.
        - '•' 점 표기는 리스트/배지 느낌을 주기 위한 간단한 장식입니다.
      */}
      <div className="mt-2 flex items-center justify-between">
        <div className="text-sm font-medium text-stone-800">• {item.title}</div>
        <span className="text-stone-400">→</span>
      </div>

      {/*
        [간단 설명]
        - 제목 아래에 한 줄 설명을 작게 표시합니다.
        - 필요 시 2~3줄로 늘리려면 CSS line-clamp 등을 적용할 수 있습니다.
      */}
      <p className="mt-1 text-xs text-stone-600">{item.desc}</p>
    </Link>
  );
}