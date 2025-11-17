/**
 * 건강 상태 확인(Health Check) 라우터
 * - 엔드포인트: GET /health
 * - 응답: 200 OK, { ok: true }
 * - 목적: 로드밸런서/오케스트레이터(liveness/readiness) 및 모니터링용
 * - 인증: 없음 (항상 공개)
 * - 사용 예시:
 *     curl -i http://localhost:3000/health
 * - 마운트: src/routes/index.ts 에서 `router.use('/health', healthRouter)`로 연결됨
 */
/**
 * ✅ 이 파일은 "서버가 살아있나요?"를 빠르게 확인하는 **헬스체크(Health Check)** 페이지입니다.
 *
 * ▶ 주소(엔드포인트)
 *   - GET /health  (예: http://localhost:3000/health)
 *
 * ▶ 정상 응답
 *   - HTTP 200 OK 와 함께  { ok: true }  라는 아주 짧은 JSON 메시지를 돌려줍니다.
 *   - 화면에  {"ok": true}  가 보이면 서버가 정상 동작 중이라는 뜻입니다.
 *
 * ▶ 왜 필요한가?
 *   - 서비스가 켜져 있는지 사람과 로봇(로드밸런서/오케스트레이터)이 **즉시 확인**하기 위해
 *   - 로그인/DB 같은 복잡한 절차 없이도 **항상 열려있는 안전한 점검용 문**이 필요합니다.
 *
 * ▶ 언제/어떻게 쓰나? (비개발자용 확인 방법)
 *   1) 브라우저 주소창에  http://localhost:3000/health  입력 → {"ok":true} 보이면 정상
 *   2) 터미널에서  curl -i http://localhost:3000/health  실행 → HTTP/1.1 200 OK 응답 확인
 *
 * ▶ 주의사항
 *   - 이 엔드포인트는 **인증 없이 공개**되어 있습니다. 비밀정보를 절대 노출하지 마세요.
 *   - 필요하면 아래 응답 객체에 버전, 서버시간, 빌드번호, DB 연결상태 등을 **추가**할 수 있습니다.
 *
 * ▶ 이 파일이 어디에 연결되나?
 *   - src/routes/index.ts 에서  router.use('/health', healthRouter)  로 묶여 최종 경로가 "/health" 가 됩니다.
 */

import { Router } from 'express';
// Router는 "작은 미니-앱"이라고 보면 됩니다. 기능별(인증, 게시물, 헬스체크 등)로 라우트를
// 파일에 나눠 담고, 나중에 메인 앱에 하나로 조립할 수 있게 도와주는 도구입니다.

const router = Router();
// 이 라우터는 "/health" 관련 주소만 담당합니다. (최종 경로는 상위에서 '/health'로 연결됩니다)

// GET /health
// - '/'는 "/health" 뒤에 아무것도 없는 경로를 의미합니다. (즉, 정확히 "/health")
// - GET은 "조회"를 의미하는 가장 단순한 요청 방식입니다.
// - 아래 핸들러는 { ok: true } 라는 JSON을 화면으로 돌려보냅니다.
router.get('/', (_req, res) => {
  res.json({ ok: true });
});

export default router; // 다른 파일(메인 라우터)에서 이 라우터를 가져다 쓸 수 있게 내보냅니다.