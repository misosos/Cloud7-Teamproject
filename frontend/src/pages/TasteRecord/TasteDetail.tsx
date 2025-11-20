// TasteDetail (기록 상세 페이지)
// 목적: 기록 목록에서 하나를 클릭했을 때, 해당 기록의 상세 내용을 보여주는 화면입니다.
//      - URL의 id 값을 읽어와서 서버에서 해당 id에 대한 상세 데이터를 조회합니다.
//      - 항목이 없으면 "기록을 찾을 수 없음" 안내를 보여주고, 목록으로 돌아가는 링크를 제공합니다.
//      - 항목이 있으면 썸네일, 제목, 설명, 카테고리/태그, 본문(content)을 순서대로 표시합니다.
//
// 누가 읽으면 좋은가요?
//  - 기획/디자인/QA 동료: 상세 화면이 어떤 정보 블록으로 구성되는지, 없는 데이터는 어떻게 처리하는지 이해할 때
//
// 데이터 흐름 요약
//  1) react-router의 useParams로 URL 경로의 id 값을 읽어 옵니다.
//  2) 서버에 /taste-records/:id 요청을 보내어 상세 데이터를 조회합니다.
//  3) 조회 실패나 항목 없음일 경우 에러/빈 상태 UI를 렌더합니다.
//  4) 항목을 정상적으로 조회했다면 화면 상단에 썸네일+제목/설명, 중간에 카테고리/태그, 하단에 본문/돌아가기 링크를 렌더합니다.
//
// 접근성/표현
//  - 썸네일 <img>에는 alt를 지정하여 스크린리더 사용자가 내용을 이해할 수 있도록 합니다.
//  - 태그는 작은 배지 형태로 반복 렌더링합니다.

import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import type { RecordItem } from "@/types/type";

export default function TasteDetail() {
  // 1) URL 경로에서 id 파라미터 읽기
  //    예: /취향기록/abc → id = "abc"
  const { id } = useParams<{ id: string }>();

  const [item, setItem] = useState<RecordItem | null>(null); // 조회된 기록 상세
  const [isLoading, setIsLoading] = useState(true); // 로딩 상태
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // 에러 메시지
  
  useEffect(() => {
    if (!id) return;
  
    const fetchDetail = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
  
        const res = await fetch(`/taste-records/${id}`, {
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
        setItem((json.data ?? null) as RecordItem | null);
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

  // 3) 렌더링 분기: 로딩 / 에러 / 데이터 없음 / 정상 상세
  if (isLoading) {
    return (
      <main className="max-w-screen-md mx-auto px-6 py-16 text-center">
        <p className="text-stone-500 text-sm">기록을 불러오는 중입니다...</p>
      </main>
    );
  }

  if (errorMessage || !item) {
    return (
      <main className="max-w-screen-md mx-auto px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold text-stone-800">기록을 찾을 수 없어요</h1>
        <p className="mt-2 text-stone-500">
          {errorMessage ?? "주소가 잘못되었거나 삭제된 기록일 수 있어요."}
        </p>
        <Link to="/취향기록" className="inline-block mt-6 text-amber-800 underline">
          ← 기록 목록으로 돌아가기
        </Link>
      </main>
    );
  }

  // 4) 정상 케이스: 상세 내용 렌더
  return (
    <main className="max-w-screen-md mx-auto px-6 py-16">
      <header className="flex items-start gap-4">
        {/* 썸네일: 있는 경우에만 렌더 (없으면 공간 낭비를 막기 위해 렌더하지 않음) */}
        {item.thumb ? (
          <img
            src={item.thumb}
            alt={item.title}
            className="w-36 h-36 object-cover rounded-md shadow-sm"
          />
        ) : null}

        {/* 타이틀/설명 및 메타 정보(카테고리/태그) */}
        <div>
          {/* 제목: 가장 크게 강조 */}
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">{item.title}</h1>
          {/* 한 줄 설명: 있는 경우에만 노출 */}
          {item.desc ? <p className="mt-2 text-stone-600">{item.desc}</p> : null}

          {/* 메타 정보: 카테고리/태그가 있을 때만 각각 노출 */}
          {"category" in item && item.category ? (
            <p className="mt-2 text-sm text-stone-500">카테고리: {item.category}</p>
          ) : null}

          {"tags" in item && Array.isArray(item.tags) && item.tags.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {item.tags.map((t) => (
                <span
                  key={t}
                  className="text-xs px-2 py-0.5 rounded-md bg-amber-100/70 text-amber-900 border border-amber-300/70"
                >
                  {t}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </header>

      {/* 본문(추후 내용 확장 가능): content가 문자열/숫자일 때만 단순 렌더 */}
      {"content" in item && item.content ? (
        <article className="prose prose-stone max-w-none mt-8">
          {typeof (item as any).content === "string" || typeof (item as any).content === "number"
            ? (item as any).content
            : null}
        </article>
      ) : null}

      {/* 하단: 목록으로 되돌아가기 링크 */}
      <footer className="mt-10">
        <Link to="/취향기록" className="text-amber-800 underline">
          ← 기록 목록으로 돌아가기
        </Link>
      </footer>
    </main>
  );
}