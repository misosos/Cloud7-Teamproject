// TasteDetail (기록 상세 페이지) - Warm Oak UI + FontAwesome 아이콘 적용 버전
// ✅ Warm Oak 토큰 적용(BG/SURFACE/TEXT/MUTED/BRAND/BRAND2/BRAND3/DANGER)
// ✅ HeaderNav 포함
// ✅ 버튼/상태 UI 통일
// ✅ 삭제 버튼도 danger 톤(B42318) 기반으로 조정
// ✅ navigate 경로: "/취향기록" 로 수정(기존 "/취향기록"과 통일)

import HeaderNav from "@/components/HeaderNav";
import { useParams, Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useEffect, useMemo, useState } from "react";
import apiClient, { buildUrl } from "@/api/apiClient";
import type { TasteRecordItem } from "@/types/type";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faSpinner,
  faTriangleExclamation,
  faCircleInfo,
  faTrashCan,
  faTag,
  faFolderOpen,
  faCalendarDays,
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

// TasteRecordItem 안에서 "이미지 경로" 후보를 추출하는 헬퍼
function getRawThumbFromItem(item: TasteRecordItem | null): string | null {
  if (!item) return null;
  const anyItem = item as any;
  return anyItem.thumb ?? anyItem.thumbUrl ?? anyItem.image ?? anyItem.imageUrl ?? null;
}

// 썸네일 URL 정규화
function resolveThumbUrl(rawThumb?: string | null): string | null {
  if (!rawThumb) return null;

  if (
    rawThumb.startsWith("http://") ||
    rawThumb.startsWith("https://") ||
    rawThumb.startsWith("blob:")
  ) {
    return rawThumb;
  }

  if (rawThumb.startsWith("/api/")) return rawThumb;

  if (rawThumb.startsWith("/uploads/")) {
    return buildUrl(rawThumb);
  }

  if (!rawThumb.startsWith("/")) {
    return buildUrl(`/uploads/taste-records/${rawThumb}`);
  }

  return buildUrl(rawThumb);
}

function StatusPanel({
  tone = "normal",
  title,
  desc,
  icon,
  action,
}: {
  tone?: "normal" | "danger";
  title: string;
  desc?: string;
  icon?: any;
  action?: React.ReactNode;
}) {
  const borderColor = tone === "danger" ? "rgba(180,35,24,0.35)" : "rgba(0,0,0,0.10)";
  const titleColor = tone === "danger" ? DANGER : TEXT;
  const descColor = tone === "danger" ? "rgba(180,35,24,0.85)" : MUTED;

  return (
    <div className="max-w-screen-md mx-auto px-6 py-16 text-center">
      <div
        className="mx-auto w-full max-w-md rounded-3xl backdrop-blur-sm px-6 py-10 relative overflow-hidden"
        style={{
          background: SURFACE,
          border: `1px solid ${borderColor}`,
          boxShadow: "0 18px 36px rgba(80,50,0,0.10)",
        }}
      >
        {/* deco */}
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
          <div className="pointer-events-none absolute inset-0" style={{ background: "rgba(180,35,24,0.06)" }} />
        ) : null}

        <div className="relative z-10">
          {icon ? (
            <div
              className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl border"
              style={{ background: "rgba(255,255,255,0.40)", borderColor: `${BRAND}33` }}
            >
              <FontAwesomeIcon icon={icon} style={{ color: tone === "danger" ? DANGER : BRAND2 }} />
            </div>
          ) : null}

          <h1 className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: titleColor }}>
            {title}
          </h1>
          {desc ? (
            <p className="mt-2 text-sm leading-6" style={{ color: descColor }}>
              {desc}
            </p>
          ) : null}

          {action ? <div className="mt-6">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}

export default function TasteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [item, setItem] = useState<TasteRecordItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [thumbLoadError, setThumbLoadError] = useState(false);

  const handleDelete = async () => {
    if (!item) return;

    const confirmed = window.confirm("정말 이 기록을 삭제하시겠습니까?");
    if (!confirmed) return;

    try {
      await apiClient.delete(`/taste-records/${(item as any).id ?? id}`);
      navigate("/취향기록", { replace: true });
    } catch (error) {
      toast.error("삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    }
  };

  useEffect(() => {
    if (!id) return;

    const fetchDetail = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const res = await fetch(buildUrl(`/taste-records/${id}`), {
          credentials: "include",
        });

        if (res.status === 401) {
          setErrorMessage("로그인이 필요한 서비스입니다.");
          setItem(null);
          return;
        }

        if (res.status === 404) {
          setErrorMessage("기록을 찾을 수 없어요. 주소가 잘못되었거나 삭제된 기록일 수 있어요.");
          setItem(null);
          return;
        }

        if (!res.ok) {
          throw new Error("기록을 불러오는 데 실패했습니다.");
        }

        const json = await res.json();
        setItem((json.data ?? null) as TasteRecordItem | null);
      } catch (error) {
        console.error("취향 기록 상세 조회 실패", error);
        setErrorMessage("기록을 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        setItem(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetail();
  }, [id]);

  // ----- 파생 값들 -----
  const rawThumb = useMemo(() => getRawThumbFromItem(item), [item]);
  const thumbUrl = useMemo(
    () => (!thumbLoadError ? resolveThumbUrl(rawThumb) : null),
    [rawThumb, thumbLoadError],
  );

  const rawContent = (item as any)?.content;
  const hasContent =
    typeof rawContent === "string" || typeof rawContent === "number"
      ? String(rawContent).trim().length > 0
      : false;

  const displayDate = useMemo(() => {
    if (!item) return null;

    const rawDateValue =
      (item as any).recordedAt ??
      (item as any).recordDate ??
      (item as any).visitedAt ??
      (item as any).createdAt;

    if (!rawDateValue) return null;

    const dateObj = new Date(rawDateValue);
    if (Number.isNaN(dateObj.getTime())) return null;

    return dateObj.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }, [item]);

  // -------------- UI: 로딩 --------------
  if (isLoading) {
    return (
      <main className="min-h-screen relative overflow-hidden" style={{ background: BG, color: TEXT }}>
        <HeaderNav />
        <StatusPanel
          title="기록을 불러오는 중입니다..."
          desc="잠시만 기다려 주세요."
          icon={faSpinner}
          action={
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-black/10">
              <div className="h-full w-1/3 animate-pulse rounded-full" style={{ background: `${BRAND}B3` }} />
            </div>
          }
        />
      </main>
    );
  }

  // -------------- UI: 에러/없음 --------------
  if (errorMessage || !item) {
    return (
      <main className="min-h-screen relative overflow-hidden" style={{ background: BG, color: TEXT }}>
        <HeaderNav />
        <StatusPanel
          tone="danger"
          title="기록을 찾을 수 없어요"
          desc={errorMessage ?? "주소가 잘못되었거나 삭제된 기록일 수 있어요."}
          icon={faTriangleExclamation}
          action={
            <Link
              to="/취향기록"
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
              style={{ background: `linear-gradient(180deg, ${BRAND2}, ${MUTED})` }}
            >
              <FontAwesomeIcon icon={faChevronLeft} />
              기록 목록으로
            </Link>
          }
        />
      </main>
    );
  }

  // -------------- UI: 정상 상세 --------------
  return (
    <main className="min-h-screen relative overflow-hidden" style={{ background: BG, color: TEXT }}>
      <HeaderNav />

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
        <div className="max-w-screen-md mx-auto px-6 py-14">
          {/* 상단 헤더 카드 */}
          <header
            className="rounded-3xl backdrop-blur-sm overflow-hidden relative"
            style={{
              background: SURFACE,
              border: "1px solid rgba(0,0,0,0.10)",
              boxShadow: "0 18px 36px rgba(80,50,0,0.10)",
            }}
          >
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px"
              style={{
                backgroundImage: `linear-gradient(90deg, transparent, ${BRAND}99, transparent)`,
              }}
            />

            {/* 썸네일이 있으면 커버처럼 */}
            {rawThumb && thumbUrl ? (
              <div className="relative">
                <img
                  src={thumbUrl}
                  alt={item.title}
                  className="
                    w-full max-h-[360px] object-cover
                    brightness-[0.98] contrast-[1.02] saturate-[1.05]
                    transition-transform duration-500
                    hover:scale-[1.01]
                  "
                  loading="lazy"
                  onError={() => {
                    console.warn("[TasteDetail] 본문 이미지 로딩 실패", { thumbUrl, item });
                    setThumbLoadError(true);
                  }}
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/15" />
              </div>
            ) : null}

            <div className="px-6 py-6 relative">
              <h1 className="text-3xl font-black tracking-tight" style={{ color: TEXT }}>
                {item.title}
              </h1>

              {(item as any).desc ? (
                <p className="mt-2 leading-6" style={{ color: "rgba(43,29,18,0.82)" }}>
                  {(item as any).desc}
                </p>
              ) : null}

              {/* 메타 */}
              <div className="mt-4 flex flex-col gap-1.5">
                {"category" in item && (item as any).category ? (
                  <p className="text-sm flex items-center gap-2" style={{ color: MUTED }}>
                    <span
                      className="inline-flex h-7 w-7 items-center justify-center rounded-xl border"
                      style={{ background: "rgba(255,255,255,0.40)", borderColor: `${BRAND}33` }}
                    >
                      <FontAwesomeIcon icon={faFolderOpen} style={{ color: BRAND2 }} />
                    </span>
                    <span className="font-extrabold" style={{ color: TEXT }}>
                      카테고리
                    </span>
                    <span style={{ color: "rgba(107,78,47,0.55)" }}>•</span>
                    <span>{(item as any).category}</span>
                  </p>
                ) : null}

                {displayDate ? (
                  <p className="text-sm flex items-center gap-2" style={{ color: MUTED }}>
                    <span
                      className="inline-flex h-7 w-7 items-center justify-center rounded-xl border"
                      style={{ background: "rgba(255,255,255,0.40)", borderColor: `${BRAND}33` }}
                    >
                      <FontAwesomeIcon icon={faCalendarDays} style={{ color: BRAND2 }} />
                    </span>
                    <span className="font-extrabold" style={{ color: TEXT }}>
                      기록 날짜
                    </span>
                    <span style={{ color: "rgba(107,78,47,0.55)" }}>•</span>
                    <span>{displayDate}</span>
                  </p>
                ) : null}

                {"tags" in item && Array.isArray((item as any).tags) && (item as any).tags.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(item as any).tags.map((t: string) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
                        style={{
                          background: "rgba(201,169,97,0.18)",
                          color: MUTED,
                          border: `1px solid rgba(201,169,97,0.35)`,
                        }}
                      >
                        <FontAwesomeIcon icon={faTag} className="text-[10px]" style={{ color: BRAND2 }} />
                        {t}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </header>

          {/* 본문 카드 */}
          <section
            className="mt-6 rounded-3xl backdrop-blur-sm px-6 py-6 relative overflow-hidden"
            style={{
              background: SURFACE,
              border: "1px solid rgba(0,0,0,0.10)",
              boxShadow: "0 18px 36px rgba(80,50,0,0.08)",
            }}
          >
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px"
              style={{
                backgroundImage: `linear-gradient(90deg, transparent, ${BRAND}99, transparent)`,
              }}
            />

            {hasContent ? (
              <div className="prose prose-stone max-w-none">
                <p className="whitespace-pre-line leading-7" style={{ color: "rgba(43,29,18,0.90)" }}>
                  {String((item as any).content)}
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <div
                  className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-2xl border"
                  style={{ background: "rgba(255,255,255,0.40)", borderColor: `${BRAND}33` }}
                >
                  <FontAwesomeIcon icon={faCircleInfo} style={{ color: BRAND2 }} />
                </div>
                <p className="text-sm" style={{ color: MUTED }}>
                  아직 본문이 없는 기록이에요.
                </p>
              </div>
            )}
          </section>

          {/* 하단 액션 */}
          <footer className="mt-8 flex items-center justify-between gap-3">
            <Link
              to="/취향기록"
              className="
                inline-flex items-center justify-center gap-2
                px-4 py-2 rounded-xl
                ring-1 ring-black/10
                text-sm font-extrabold
                shadow-[0_10px_22px_rgba(80,50,0,0.08)]
                transition-transform duration-200
                hover:-translate-y-0.5 active:translate-y-0
                outline-none focus:outline-none focus-visible:outline-none
                focus-visible:ring-2 focus-visible:ring-[#c9a961]/45
              "
              style={{ background: "rgba(255,255,255,0.40)", color: MUTED }}
            >
              <FontAwesomeIcon icon={faChevronLeft} />
              기록 목록
            </Link>

            <button
              type="button"
              onClick={handleDelete}
              className="
                inline-flex items-center justify-center gap-2
                px-4 py-2 rounded-xl
                text-sm font-extrabold
                shadow-[0_12px_26px_rgba(80,50,0,0.20)]
                ring-1 ring-black/10
                transition-transform duration-200
                hover:-translate-y-0.5 active:translate-y-0
                outline-none focus:outline-none focus-visible:outline-none
                focus-visible:ring-2 focus-visible:ring-[#c9a961]/45
              "
              style={{
                background: `linear-gradient(180deg, ${DANGER}, rgba(90,34,28,1))`,
                color: "#ffe7e3",
              }}
            >
              <FontAwesomeIcon icon={faTrashCan} />
              기록 삭제
            </button>
          </footer>
        </div>
      </div>
    </main>
  );
}