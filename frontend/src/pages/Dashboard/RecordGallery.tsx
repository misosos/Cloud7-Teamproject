import { useEffect, useMemo, useState } from "react";
import SectionTitle from "@/components/SectionTitle";
import BookCard from "@/components/BookCard";
import useCategory from "@/store/useCategory";
import { httpGet } from "@/api/apiClient";
import type { TasteRecordItem, TasteRecordListResponse } from "@/types/type";

/**
 * RecordGallery (기록 갤러리 섹션)
 * - 우드톤 UI 통일
 * - 클릭 방해 레이어(pointer-events-none) 방지
 * - 기본 링(겉선) 제거, 포커스(focus-visible)일 때만 링 표시 (BookCard에서 처리)
 */

function WoodPanel({
  title,
  desc,
  tone = "normal",
  action,
}: {
  title: string;
  desc?: string;
  tone?: "normal" | "danger";
  action?: React.ReactNode;
}) {
  const titleColor = tone === "danger" ? "text-red-800" : "text-[#2b1d12]";
  const descColor = tone === "danger" ? "text-red-700/80" : "text-[#6b4e2f]";

  return (
    <div className="mx-auto max-w-screen-xl px-6 md:px-12">
      <div
        className={`
          relative overflow-hidden rounded-3xl
          bg-[rgba(255,255,255,0.55)]
          shadow-[0_18px_36px_rgba(80,50,0,0.10)]
          backdrop-blur-sm
          px-6 py-10
        `}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#c9a961]/60 to-transparent" />
        <div className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full bg-[#c9a961]/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-28 w-72 h-72 rounded-full bg-[#6b4e2f]/10 blur-3xl" />

        <div className="relative z-10 text-center">
          <h3 className={`text-lg sm:text-xl font-black ${titleColor}`}>{title}</h3>
          {desc ? <p className={`mt-2 text-sm ${descColor}`}>{desc}</p> : null}
          {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
        </div>

        {tone === "danger" ? (
          <div className="pointer-events-none absolute inset-0 rounded-3xl bg-red-500/5" />
        ) : null}
      </div>
    </div>
  );
}

export default function RecordGallery() {
  const current = useCategory((s) => s.current);

  const [records, setRecords] = useState<TasteRecordItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchRecords() {
      setLoading(true);
      setError(null);

      try {
        const res = await httpGet<TasteRecordListResponse>("/taste-records");
        if (!res.ok) throw new Error("기록 목록 조회 실패");
        if (!cancelled) setRecords(res.data ?? []);
      } catch (e) {
        console.error("[RecordGallery] 기록 목록 조회 실패:", e);
        if (!cancelled) setError("기록을 불러오는 데 실패했습니다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchRecords();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    return records
      .filter((it) => it.category === current)
      .sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 4);
  }, [records, current]);

  return (
    <section className="mt-20 md:mt-24 mb-28 md:mb-40 relative">
      <SectionTitle>{current}</SectionTitle>

      <div className="relative mt-10 md:mt-12">
        {loading ? (
          <WoodPanel title="기록을 불러오는 중입니다..." desc="잠시만 기다려 주세요." />
        ) : error ? (
          <WoodPanel tone="danger" title="불러오기에 실패했어요" desc={error} />
        ) : filtered.length === 0 ? (
          <WoodPanel title="아직 이 카테고리에 기록이 없어요" desc="새로운 기록을 만들어보세요!" />
        ) : (
          <div className="mx-auto max-w-screen-xl px-6 md:px-12">
            <div
              className="
                relative z-10
                mt-10 md:mt-16
                grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4
                gap-x-10 md:gap-x-14 lg:gap-x-16
                gap-y-16 md:gap-y-20 lg:gap-y-24
                justify-items-center
              "
            >
              {filtered.map((it) => (
                // ✅ 래퍼는 레이아웃용만. 링/아웃라인 절대 금지.
                <div key={it.id} className="rounded-2xl">
                  <BookCard item={it} />
                </div>
              ))}
            </div>

            <div className="pointer-events-none mt-6 h-8 w-full bg-gradient-to-b from-black/10 to-transparent blur-2xl opacity-25" />
          </div>
        )}
      </div>
    </section>
  );
}