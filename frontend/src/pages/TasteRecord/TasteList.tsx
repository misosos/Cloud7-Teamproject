// TasteList (취향 기록 목록 화면)
// 목적: 사용자가 저장해 둔 "기록"(책/앨범 같은 카드)을 슬라이더로 훑어보고,
//       새 기록을 추가할 수 있는 메인 목록 화면입니다.
//
// 누가 보면 좋은가요?
//  - 기획/디자인/QA 동료: 이 페이지가 어떤 블록(헤더/히어로/슬라이더/모달)으로 구성되고
//    데이터가 어디서 와서 어디로 가는지 한눈에 파악할 수 있습니다.
//
// 화면 구성(위→아래)
//  1) HeaderNav      : 상단 네비게이션(로그인 상태/메뉴/CTA)
//  2) Hero(제목)     : "취향기록" 타이틀 섹션
//  3) RecordSlider   : 카드(책 프레임)로 된 기록들을 좌우로 넘기며 보는 슬라이더
//  4) AddButton      : "기록 추가" 버튼을 누르면 TasteRecordModal(작성 모달) 열림
//  5) TasteRecordModal: 제목/캡션/카테고리/태그/내용을 입력받아 새 기록 작성
//
// 데이터 소스
//  - recordsAll: 서버에서 /taste-records 로 조회한 실제 기록 목록
//  - categoryOptions/tagOptions: 작성 모달에 내려보낼 선택 옵션(더미, 추후 API 연동 가능)

import HeaderNav from "@/components/HeaderNav";
import { useRef, useState, useEffect, useCallback } from "react";
import TasteRecordModal from "@/components/TasteRecordModal";
import FolderImg from "@/assets/ui/folder.png";
import BookCard from "@/components/BookCard";
import type { TasteRecordItem } from "@/types/type";
import { categoryOptions, tagOptions } from "@/data/mock";

/**
 * SectionTitle: 섹션 제목 + 얇은 구분선
 * - children: 제목에 들어갈 내용(텍스트/아이콘 등)
 * - action  : 우측에 붙는 작은 액션(버튼 등) (선택)
 * ※ 이 파일 내부에서만 쓰는 간이 버전입니다. (공용 컴포넌트와 별개)
 */
function SectionTitle({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="max-w-screen-xl mx-auto px-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl sm:text-4xl font-semibold text-stone-800 tracking-tight">
          {children}
        </h2>
        {/* action이 있으면 우측에 렌더(예: "기록 추가" 버튼) */}
        {action ? <div className="ml-4">{action}</div> : null}
      </div>
      {/* 얇은 가로 구분선 */}
      <div className="mt-3 h-px w-full bg-stone-300/70" />
    </div>
  );
}

/**
 * FolderCard: 썸네일 + 제목 + 설명을 세로로 보여주는 소형 카드(그리드용)
 * - item.thumb가 없으면 폴더 아이콘(FolderImg)으로 대체 노출
 * - 현재는 사용하지 않지만(주석 처리된 "컬렉션" 섹션), 디자인 참고용으로 유지
 */
function FolderCard({ item }: { item: TasteRecordItem }) {
  return (
    <li className="flex flex-col items-center text-center">
      <div className="w-24 sm:w-28">
        {/* 장식용 이미지는 alt=""로 스크린리더가 읽지 않도록 처리 */}
        <img
          src={item.thumb ?? FolderImg}
          alt=""
          className="w-full h-auto select-none"
        />
      </div>
      <div className="mt-2 space-y-0.5">
        <p className="text-sm font-medium text-stone-800">{item.title}</p>
        <p className="text-xs text-stone-500">{item.desc}</p>
      </div>
    </li>
  );
}

/**
 * RecordSlider: 가로 스크롤 슬라이더(카드들을 좌우로 넘겨봄)
 * - items: 보여줄 기록 카드 배열
 * 동작
 *  - 좌/우 버튼 클릭 시, 트랙(가로 스크롤 영역)을 컨테이너 너비의 90%만큼 이동
 *  - 모바일에서는 버튼을 숨기고, 손가락 스와이프로 스크롤(오버플로우 허용)
 */
function RecordSlider({ items }: { items: TasteRecordItem[] }) {
  const trackRef = useRef<HTMLDivElement>(null); // 스크롤되는 트랙 DOM 참조

  const scroll = (dir: number) => {
    const el = trackRef.current;
    if (!el) return;
    const amount = Math.round(el.clientWidth * 0.9); // 한 번에 이동할 거리(컨테이너의 90%)
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  return (
    <div className="relative mx-auto max-w-screen-xl px-6">
      {/* Prev(이전) 버튼 — 모바일에서는 숨김 */}
      <button
        type="button"
        onClick={() => scroll(-1)}
        aria-label="이전"
        className="absolute left-2 top-1/2 -translate-y-1/2 z-10 hidden sm:inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/80 shadow ring-1 ring-stone-300 hover:bg-white"
      >
        ‹
      </button>

      {/* 가로 스크롤 트랙: 스크롤바는 숨김 처리 */}
      <div
        ref={trackRef}
        className="overflow-x-auto scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        <ul className="flex gap-10 sm:gap-12 py-4 snap-x snap-mandatory">
          {items.map((r) => (
            <li key={r.id} className="snap-start shrink-0">
              {/* 각 아이템은 BookCard(책 프레임 카드)로 렌더 */}
              <BookCard item={r} />
            </li>
          ))}
        </ul>
      </div>

      {/* Next(다음) 버튼 — 모바일에서는 숨김 */}
      <button
        type="button"
        onClick={() => scroll(1)}
        aria-label="다음"
        className="absolute right-2 top-1/2 -translate-y-1/2 z-10 hidden sm:inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/80 shadow ring-1 ring-stone-300 hover:bg-white"
      >
        ›
      </button>
    </div>
  );
}

/**
 * AddButton: 작은 플러스(+) 아이콘과 함께 나타나는 라벨 버튼
 * - onClick: 클릭 시 실행할 동작(여기서는 작성 모달 열기)
 */
function AddButton({
  onClick,
  children,
}: {
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-md border border-amber-400/70 bg-amber-100/70 hover:bg-amber-200/70 text-amber-900 text-sm px-3 py-1.5 shadow-sm transition"
    >
      {/* 시각적 아이콘(장식) — 스크린리더는 텍스트 라벨(children)만 읽으면 충분 */}
      <svg
        className="w-4 h-4"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M10 4a1 1 0 011 1v4h4a1 1 0 110 2h-4v4a1 1 0 11-2 0v-4H5a1 1 0 110-2h4V5a1 1 0 011-1z" />
      </svg>
      {children}
    </button>
  );
}

/**
 * TasteList: 이 파일의 메인 페이지 컴포넌트
 * - "기록 추가" 버튼 클릭 → 작성 모달(TasteRecordModal) open 상태 관리
 * - 서버에서 조회한 recordsAll을 BookCard 슬라이더로 보여줌
 * - 모달에서 새 기록 저장 성공 시, 새로고침 없이 recordsAll에 즉시 반영
 */
export default function TasteList() {
  const [isModalOpen, setIsModalOpen] = useState(false); // 작성 모달 열림 상태
  const [recordsAll, setRecordsAll] = useState<TasteRecordItem[]>([]); // 서버에서 불러온 기록 목록
  const [isLoading, setIsLoading] = useState(true); // 목록 불러오는 중 여부
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // 오류 메시지 (네트워크/인증 등)

  /**
   * 서버에서 취향 기록 목록 조회
   * - 컴포넌트 마운트 시 1회 호출
   * - 필요하면 나중에 "새로고침" 액션 등에서 재사용할 수 있도록 useCallback으로 분리
   */
  const fetchRecords = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      // 프록시 설정에 의해 /taste-records -> /api/taste-records 로 전달됨
      const res = await fetch("/taste-records", {
        credentials: "include",
      });

      if (res.status === 401) {
        // 로그인 필요
        setErrorMessage("로그인이 필요한 서비스입니다.");
        setRecordsAll([]);
        return;
      }

      if (!res.ok) {
        throw new Error("기록을 불러오는 데 실패했습니다.");
      }

      const json = await res.json();
      setRecordsAll((json.data ?? []) as TasteRecordItem[]);
    } catch (error) {
      console.error("취향 기록 목록 조회 실패", error);
      setErrorMessage(
        "기록을 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 마운트 시 최초 1회 목록 조회
  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  /**
   * 모달에서 "저장 성공" 시 호출되는 콜백
   * - 새로 생성된 기록을 현재 리스트 맨 앞에 추가
   * - 필요하면 fetchRecords()를 다시 불러서 서버 상태와 완전히 동기화할 수도 있음
   */
  const handleSaveSuccess = (newRecord: TasteRecordItem) => {
    setRecordsAll((prev) => [newRecord, ...prev]);
    // 만약 "서버에서 다시 전체 리스트를 받는게 더 안전"하다고 느껴지면:
    // fetchRecords();
  };

  return (
    <>
      {/* 상단 네비게이션(로그인 상태/메뉴/CTA) */}
      <HeaderNav />

      <main className="pb-28">
        {/* 1) 히어로(타이틀) */}
        <section className="pt-16 sm:pt-20 pb-10">
          <div className="max-w-screen-xl mx-auto px-6">
            <h1 className="text-center text-4xl sm:text-5xl font-bold text-stone-900 tracking-tight">
              취향기록
            </h1>
          </div>
        </section>

        {/* 2) 기록 슬라이더(좌우 넘김) + 우측 액션("기록 추가") */}
        <section className="pt-2 pb-8">
          <SectionTitle
            action={
              <AddButton onClick={() => setIsModalOpen(true)}>
                기록 추가
              </AddButton>
            }
          >
            기록
          </SectionTitle>
          <div className="mt-8">
            {isLoading ? (
              <p className="text-sm text-stone-500 text-center">
                기록을 불러오는 중입니다...
              </p>
            ) : errorMessage ? (
              <p className="text-sm text-red-600 text-center">
                {errorMessage}
              </p>
            ) : recordsAll.length === 0 ? (
              <p className="text-sm text-stone-500 text-center">
                아직 저장된 기록이 없습니다. &quot;기록 추가&quot; 버튼을
                눌러 첫 기록을 남겨보세요.
              </p>
            ) : (
              <RecordSlider items={recordsAll} />
            )}
          </div>
        </section>

        {/* 3) 작성 모달: 열림 상태에 따라 표시, 더미 옵션 + 저장 성공 콜백 전달 */}
        <TasteRecordModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          // readonly 튜플 → 일반 string[]으로 복사해서 전달
          categoryOptions={[...categoryOptions]}
          tagOptions={[...tagOptions]}
          onSaveSuccess={handleSaveSuccess} // ✅ 새 기록이 저장되면 리스트 상태에 바로 추가
        />
      </main>
    </>
  );
}