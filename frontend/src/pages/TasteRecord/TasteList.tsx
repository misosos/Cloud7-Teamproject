// TasteList (취향 기록 목록 화면) - Warm Oak UI 통일 + FontAwesome 아이콘 버전
// ✅ TS2353(ringColor) 오류 해결: style 객체에서 ringColor 제거, border로 대체
// ✅ 클릭 이슈 방지: 장식 레이어(pointer-events-none) + 내용(z-10)

import HeaderNav from "@/components/HeaderNav";
import { useRef, useState, useEffect, useCallback } from "react";
import TasteRecordModal from "@/components/TasteRecordInlineForm";
import BookCard from "@/components/BookCard";
import type { TasteRecordItem } from "@/types/type";
import { categoryOptions, tagOptions } from "@/data/mock";
import { buildUrl } from "@/api/apiClient";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMapLocationDot,
  faPlus,
  faChevronLeft,
  faChevronRight,
  faRotateRight,
  faSpinner,
  faTriangleExclamation,
  faCircleInfo,
} from "@fortawesome/free-solid-svg-icons";

// =========================
// Warm Oak Theme Tokens
// =========================
const BG = "#F7F0E6";
const SURFACE = "rgba(255,255,255,0.55)";
const TEXT = "#2B1D12";
const MUTED = "#6B4E2F";
const BRAND = "#C9A961";
const BRAND2 = "#8B6F47";
const DANGER = "#B42318";

/**
 * SectionTitle: 섹션 제목 + 얇은 구분선 (Warm Oak)
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
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2
            className="text-3xl sm:text-4xl font-black tracking-tight"
            style={{ color: TEXT }}
          >
            {children}
          </h2>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div
        className="mt-4 h-px w-full"
        style={{
          backgroundImage: `linear-gradient(90deg, transparent, ${BRAND}, transparent)`,
        }}
      />
    </div>
  );
}

/**
 * RecordSlider: Warm Oak 슬라이더
 * ✅ 버튼이 카드/트랙과 붙는 문제 해결:
 *   - Track에 px-14 / sm:px-16 padding 추가 (버튼 공간 확보)
 *   - 버튼을 살짝 바깥으로 이동(-left-2 / -right-2)해서 여유감 추가
 */
function RecordSlider({ items }: { items: TasteRecordItem[] }) {
  const trackRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: number) => {
    const el = trackRef.current;
    if (!el) return;
    const amount = Math.round(el.clientWidth * 0.9);
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  return (
    <div className="relative mx-auto max-w-screen-xl px-6">
      {/* Prev */}
      <button
        type="button"
        onClick={() => scroll(-1)}
        aria-label="이전"
        className="
          absolute -left-2 sm:-left-4 top-1/2 -translate-y-1/2 z-10 hidden sm:inline-flex
          items-center justify-center w-10 h-10 rounded-xl
          text-amber-50 font-black
          shadow-[0_12px_26px_rgba(80,50,0,0.22)]
          ring-1 ring-black/10
          transition-transform duration-200
          hover:-translate-y-[52%] active:translate-y-[-50%]
          outline-none focus:outline-none focus-visible:outline-none
          focus-visible:ring-2 focus-visible:ring-[#c9a961]/45
        "
        style={{ background: `linear-gradient(180deg, ${BRAND2}, ${MUTED})` }}
      >
        <FontAwesomeIcon icon={faChevronLeft} />
      </button>

      {/* Track */}
      <div
        ref={trackRef}
        className="
          overflow-x-auto scroll-smooth
          [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden
          px-14 sm:px-16
        "
      >
        <ul className="flex gap-10 sm:gap-12 py-5 snap-x snap-mandatory">
          {items.map((r) => (
            <li key={r.id} className="snap-start shrink-0">
              <BookCard item={r} />
            </li>
          ))}
        </ul>
      </div>

      {/* Next */}
      <button
        type="button"
        onClick={() => scroll(1)}
        aria-label="다음"
        className="
          absolute -right-2 sm:-right-4 top-1/2 -translate-y-1/2 z-10 hidden sm:inline-flex
          items-center justify-center w-10 h-10 rounded-xl
          text-amber-50 font-black
          shadow-[0_12px_26px_rgba(80,50,0,0.22)]
          ring-1 ring-black/10
          transition-transform duration-200
          hover:-translate-y-[52%] active:translate-y-[-50%]
          outline-none focus:outline-none focus-visible:outline-none
          focus-visible:ring-2 focus-visible:ring-[#c9a961]/45
        "
        style={{ background: `linear-gradient(180deg, ${BRAND2}, ${MUTED})` }}
      >
        <FontAwesomeIcon icon={faChevronRight} />
      </button>

      {/* 아래 은은한 바닥 그림자 */}
      <div className="pointer-events-none mt-2 h-6 w-full bg-gradient-to-b from-black/10 to-transparent blur-2xl opacity-30" />
    </div>
  );
}

/**
 * AddButton: Warm Oak 메인 CTA
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
      type="button"
      onClick={onClick}
      className="
        inline-flex items-center gap-2 rounded-xl
        text-amber-50 text-sm px-4 py-2.5 font-extrabold tracking-wide
        shadow-[0_12px_26px_rgba(80,50,0,0.20)]
        ring-1 ring-black/10
        transition-transform duration-200
        hover:-translate-y-0.5 active:translate-y-0
        outline-none focus:outline-none focus-visible:outline-none
        focus-visible:ring-2 focus-visible:ring-[#c9a961]/45
      "
      style={{ background: `linear-gradient(180deg, ${BRAND2}, ${MUTED})` }}
    >
      <FontAwesomeIcon icon={faPlus} />
      {children}
    </button>
  );
}

/**
 * StatusPanel: 로딩/에러/빈 상태 공용 패널 (Warm Oak)
 * ✅ TS2353 해결: style에 ringColor 사용 금지 → border로 대체
 * ✅ 클릭 이슈 방지: 장식 레이어(pointer-events-none) + 내용(z-10)
 */
function StatusPanel({
  title,
  desc,
  tone = "normal",
  action,
  icon,
}: {
  title: string;
  desc?: string;
  tone?: "normal" | "danger";
  action?: React.ReactNode;
  icon?: any;
}) {
  const borderColor =
    tone === "danger" ? "rgba(180,35,24,0.35)" : "rgba(0,0,0,0.10)";
  const titleColor = tone === "danger" ? DANGER : TEXT;
  const descColor = tone === "danger" ? "rgba(180,35,24,0.85)" : MUTED;

  return (
    <div className="mx-auto max-w-screen-xl px-6">
      <div
        className="relative overflow-hidden rounded-3xl backdrop-blur-sm px-6 py-10"
        style={{
          background: SURFACE,
          border: `1px solid ${borderColor}`,
          boxShadow: "0 18px 36px rgba(80,50,0,0.10)",
        }}
      >
        {/* ✅ 장식은 클릭을 막지 않게 */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            backgroundImage: `linear-gradient(90deg, transparent, ${BRAND}99, transparent)`,
          }}
        />
        <div
          className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl"
          style={{ background: `${BRAND}26` }}
        />
        <div
          className="pointer-events-none absolute -bottom-28 -left-28 w-72 h-72 rounded-full blur-3xl"
          style={{ background: `${MUTED}1A` }}
        />
        {tone === "danger" ? (
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "rgba(180,35,24,0.06)" }}
          />
        ) : null}

        {/* ✅ 실제 텍스트/버튼은 위로 */}
        <div className="relative z-10">
          <div className="flex items-start gap-3">
            {icon ? (
              <div
                className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-2xl border"
                style={{
                  background: "rgba(255,255,255,0.40)",
                  borderColor: `${BRAND}33`,
                }}
              >
                <FontAwesomeIcon
                  icon={icon}
                  style={{ color: tone === "danger" ? DANGER : BRAND2 }}
                />
              </div>
            ) : null}

            <div className="min-w-0">
              <h3 className="text-lg sm:text-xl font-black" style={{ color: titleColor }}>
                {title}
              </h3>
              {desc ? (
                <p className="mt-2 text-sm" style={{ color: descColor }}>
                  {desc}
                </p>
              ) : null}
            </div>
          </div>

          {action ? <div className="mt-6">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}

export default function TasteList() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recordsAll, setRecordsAll] = useState<TasteRecordItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const res = await fetch(buildUrl("/taste-records"), {
        credentials: "include",
      });

      if (res.status === 401) {
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
      setErrorMessage("기록을 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleSaveSuccess = (newRecord: TasteRecordItem) => {
    setRecordsAll((prev) => [newRecord, ...prev]);
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: BG, color: TEXT }}>
      {/* 배경 결(선택) */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, rgba(107,78,47,0.05) 0px, rgba(107,78,47,0.05) 18px, rgba(255,255,255,0.02) 18px, rgba(255,255,255,0.02) 36px)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_10%,rgba(201,169,97,0.18),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_75%_85%,rgba(107,78,47,0.14),transparent_55%)]" />

      <div className="relative">
        <HeaderNav />

        <main className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-6 py-10">
          {/* 히어로 */}
          <section className="mb-8">
            <header
              className="
                rounded-3xl
                ring-1 ring-black/10
                shadow-[0_18px_36px_rgba(80,50,0,0.10)]
                backdrop-blur-sm
                px-6 py-7
                relative overflow-hidden
              "
              style={{ background: SURFACE }}
            >
              {/* ✅ 장식 레이어는 클릭 막지 않게 */}
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-px"
                style={{
                  backgroundImage: `linear-gradient(90deg, transparent, ${BRAND}99, transparent)`,
                }}
              />
              <div
                className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl"
                style={{ background: `${BRAND}26` }}
              />
              <div
                className="pointer-events-none absolute -bottom-28 -left-28 w-72 h-72 rounded-full blur-3xl"
                style={{ background: `${MUTED}1A` }}
              />

              {/* ✅ 실제 콘텐츠는 위로 */}
              <div className="relative z-10">
                <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
                  <span
                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border"
                    style={{ background: "rgba(255,255,255,0.40)", borderColor: `${BRAND}33` }}
                  >
                    <FontAwesomeIcon icon={faMapLocationDot} style={{ color: BRAND2 }} />
                  </span>
                  <span style={{ color: TEXT }}>취향기록</span>
                </h1>

                <p className="mt-2 text-base font-medium" style={{ color: MUTED }}>
                  나만의 취향을 기록하고 모아보세요.
                </p>

                <div className="mt-6">
                  <AddButton onClick={() => setIsModalOpen(true)}>기록 추가</AddButton>
                </div>
              </div>
            </header>
          </section>

          {/* 작성 영역(인라인 모달 섹션) */}
          <TasteRecordModal
            open={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            categoryOptions={[...categoryOptions]}
            tagOptions={[...tagOptions]}
            onSaveSuccess={handleSaveSuccess}
          />

          {/* 슬라이더 섹션 */}
          <section className="pt-2 pb-8">
            <SectionTitle
              action={
                <button
                  type="button"
                  onClick={fetchRecords}
                  className="
                    inline-flex items-center gap-2 rounded-xl
                    ring-1 ring-black/10
                    text-sm font-extrabold
                    px-4 py-2.5
                    shadow-[0_12px_26px_rgba(80,50,0,0.08)]
                    transition-transform duration-200
                    hover:-translate-y-0.5 active:translate-y-0
                    outline-none focus:outline-none focus-visible:outline-none
                    focus-visible:ring-2 focus-visible:ring-[#c9a961]/45
                  "
                  style={{
                    background: "rgba(255,255,255,0.40)",
                    color: MUTED,
                  }}
                >
                  <FontAwesomeIcon icon={faRotateRight} />
                  새로고침
                </button>
              }
            >
              기록
            </SectionTitle>

            <div className="mt-8">
              {isLoading ? (
                <StatusPanel
                  title="기록을 불러오는 중입니다..."
                  desc="잠시만 기다려 주세요."
                  icon={faSpinner}
                />
              ) : errorMessage ? (
                <StatusPanel
                  tone="danger"
                  title="불러오기에 실패했어요"
                  desc={errorMessage}
                  icon={faTriangleExclamation}
                  action={
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={fetchRecords}
                        className="
                          inline-flex items-center justify-center gap-2
                          px-4 py-2 rounded-xl
                          text-amber-50 text-sm font-extrabold
                          shadow-[0_12px_26px_rgba(80,50,0,0.20)]
                          ring-1 ring-black/10
                          transition-transform duration-200
                          hover:-translate-y-0.5 active:translate-y-0
                          outline-none focus:outline-none focus-visible:outline-none
                          focus-visible:ring-2 focus-visible:ring-[#c9a961]/45
                        "
                        style={{
                          background: `linear-gradient(180deg, ${BRAND2}, ${MUTED})`,
                        }}
                      >
                        <FontAwesomeIcon icon={faRotateRight} />
                        다시 시도
                      </button>
                    </div>
                  }
                />
              ) : recordsAll.length === 0 ? (
                <StatusPanel
                  title="아직 저장된 기록이 없습니다."
                  desc='오른쪽 위 "기록 추가" 버튼을 눌러 첫 기록을 남겨보세요.'
                  icon={faCircleInfo}
                  action={<AddButton onClick={() => setIsModalOpen(true)}>첫 기록 만들기</AddButton>}
                />
              ) : (
                <RecordSlider items={recordsAll} />
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}