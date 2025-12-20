// BookCard.tsx
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { TasteRecordItem } from "@/types/type";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

function resolveThumbSrc(thumb?: string | null) {
  if (!thumb || !thumb.trim()) return null;
  if (thumb.startsWith("http")) return thumb;
  if (thumb.startsWith("/")) return `${API_BASE_URL}${thumb}`;
  return thumb;
}

export default function BookCard({ item }: { item: TasteRecordItem }) {
  const [thumbError, setThumbError] = useState(false);

  const thumbSrc = useMemo(() => resolveThumbSrc(item.thumb), [item.thumb]);
  const showThumb = !!thumbSrc && !thumbError;

  return (
    <Link
      to={`/취향기록/${item.id}`}
      aria-label={`${item.title} 상세로 이동`}
      className={[
        "group relative block",
        // ✅ 카드 크기 = 기본 아이콘 카드 크기로 고정
        "w-[210px] min-w-[210px] shrink-0",
        "transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0",
        "outline-none focus:outline-none",
        "after:content-[''] after:pointer-events-none after:absolute after:inset-0 after:rounded-2xl",
        "after:opacity-0 after:transition-opacity after:duration-200",
        "focus-visible:after:opacity-100",
        "focus-visible:after:ring-2 focus-visible:after:ring-[#c9a961]/45",
        "focus-visible:after:ring-offset-2 focus-visible:after:ring-offset-[#fdf8f1]",
      ].join(" ")}
    >
      <div
        className={[
          "relative rounded-2xl overflow-hidden",
          "bg-[rgba(255,255,255,0.62)]",
          "border border-[#C9A961]/35",
          "shadow-[0_14px_30px_rgba(80,50,0,0.12)]",
          "group-hover:shadow-[0_22px_44px_rgba(80,50,0,0.16)]",
          "transition-shadow duration-200",
        ].join(" ")}
      >
        {/* BOOK SPINE */}
        <div
          className="
            pointer-events-none absolute inset-y-0 left-0 w-[14px]
            bg-[linear-gradient(180deg,#8B6F47_0%,#6B4E2F_55%,#4A3420_100%)]
            shadow-[inset_-1px_0_0_rgba(255,255,255,0.22)]
          "
        />
        <div className="pointer-events-none absolute inset-y-0 left-[14px] w-px bg-[#2B1D12]/10" />

        {/* cover highlight */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_30%_20%,rgba(255,255,255,0.28)_0%,transparent_55%)]" />

        {/* ✅ thumb area: 책등과 겹치지 않게 좌측 패딩 보정 */}
        <div className="pt-3 pr-3 pb-3 pl-[22px]">
          <div
            className="
              relative aspect-[4/3] rounded-xl overflow-hidden
              bg-white/55 border border-[#C9A961]/25
              flex items-center justify-center
            "
          >
            <div className="w-full h-full p-4 flex items-center justify-center">
              {showThumb ? (
                <img
                  src={thumbSrc!}
                  alt={item.title}
                  className="
                    max-w-[70%] max-h-[70%]
                    object-contain
                    transition-transform duration-300
                    group-hover:scale-[1.03]
                  "
                  onError={() => setThumbError(true)}
                  loading="lazy"
                />
              ) : (
                <i className="fas fa-image text-4xl text-[#6B4E2F]/45" aria-hidden="true" />
              )}
            </div>

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/18 via-transparent to-black/8 opacity-80" />
          </div>
        </div>

        {/* text area ✅ • 제거 + 왼쪽 여백 보정(책등 고려) */}
        <div className="px-3 pb-3 pl-[22px]">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold text-[#2B1D12]/85 truncate" title={item.title}>
              {item.title}
            </div>
            <span className="text-[#8B6F47]/65 group-hover:text-[#8B6F47] transition-all duration-200 group-hover:translate-x-0.5">
              →
            </span>
          </div>

          <p className="mt-1 text-xs text-[#6B4E2F]/80 leading-5 line-clamp-2">
            {item.desc}
          </p>
        </div>
      </div>
    </Link>
  );
}