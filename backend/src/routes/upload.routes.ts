// backend/src/routes/upload.routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import authRequired from '../middlewares/authRequired';

/**
 * 파일 업로드 라우터
 * ============================================================================
 * 📌 최종 엔드포인트 (app.ts / routes/index.ts 기준)
 *
 *   - [POST] /api/uploads/taste-records
 *       : 취향 기록(맛집/장소 등) 대표 이미지 업로드
 *
 *   - [POST] /api/uploads/guilds
 *       : 탐험가 연맹(길드) 대표 이미지 업로드
 *
 * 업로드된 파일은 서버 디렉터리:
 *   - /uploads/taste-records/*
 *   - /uploads/guilds/*
 * 에 저장되며, 클라이언트에는 아래와 같이 공개 URL이 반환됩니다.
 *
 *   {
 *     ok: true,
 *     url: "/uploads/taste-records/파일명-타임스탬프.ext"
 *   }
 *
 * 프론트엔드에서 사용 예시:
 *
 *   const formData = new FormData();
 *   formData.append('file', file); // 필수: 필드명은 "file"
 *
 *   await axios.post('/api/uploads/taste-records', formData, {
 *     withCredentials: true,
 *     headers: { 'Content-Type': 'multipart/form-data' },
 *   });
 *
 * ⚠️ 이 API는 모두 로그인 필수(authRequired)입니다.
 */

// ---------------------------------------------------------------------------
// 업로드 디렉터리 설정
// ---------------------------------------------------------------------------

// 업로드될 실제 디렉터리 경로 (…/backend/uploads/taste-records)
const tasteRecordsUploadDir = path.resolve(
  __dirname,
  '..',
  '..',
  'uploads',
  'taste-records',
);
fs.mkdirSync(tasteRecordsUploadDir, { recursive: true });

// 연맹 이미지 업로드 디렉터리 경로 (…/backend/uploads/guilds)
const guildsUploadDir = path.resolve(__dirname, '..', '..', 'uploads', 'guilds');
fs.mkdirSync(guildsUploadDir, { recursive: true });



// 연맹 도감 기록 이미지 업로드 디렉터리 경로 (…/backend/uploads/guild-records)
const guildRecordsUploadDir = path.resolve(__dirname, '..', '..', 'uploads', 'guild-records');
fs.mkdirSync(guildRecordsUploadDir, { recursive: true });

// ---------------------------------------------------------------------------
// 공통 파일명 생성 로직
// ---------------------------------------------------------------------------
const createFilename = (originalName: string) => {
  const ext = path.extname(originalName); // .jpg, .png 등
  const base = path.basename(originalName, ext);
  const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
  return `${base}-${unique}${ext}`;
};

// 파일 저장 방식 설정 (taste-records용)
// ---------------------------------------------------------------------------
const tasteRecordsStorage = multer.diskStorage({
  // 파일이 저장될 폴더
  destination: (_req, _file, cb) => {
    cb(null, tasteRecordsUploadDir);
  },
  // 저장될 파일명 규칙
  filename: (_req, file, cb) => {
    cb(null, createFilename(file.originalname));
  },
});


// ---------------------------------------------------------------------------
// 파일 저장 방식 설정 (guilds용)
// ---------------------------------------------------------------------------
const guildsStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, guildsUploadDir);
  },
  filename: (_req, file, cb) => {
    cb(null, createFilename(file.originalname));
  },
});

// ---------------------------------------------------------------------------
// 파일 저장 방식 설정 (guild-records용)
// ---------------------------------------------------------------------------
const guildRecordsStorage = multer.diskStorage({
  // 파일이 저장될 폴더
  destination: (_req, _file, cb) => {
    cb(null, guildRecordsUploadDir);
  },
  // 저장될 파일명 규칙
  filename: (_req, file, cb) => {
    cb(null, createFilename(file.originalname));
  },
});

// ---------------------------------------------------------------------------
// Multer 인스턴스
//  - 필요하다면 추후 이미지 용량/타입 제한도 여기서 설정 가능
// ---------------------------------------------------------------------------
const uploadTasteRecords = multer({ storage: tasteRecordsStorage });
const uploadGuilds = multer({ storage: guildsStorage });
const uploadGuildRecords = multer({ storage: guildRecordsStorage });
const router = Router();

// ---------------------------------------------------------------------------
// [POST] /api/uploads/taste-records
//  - 취향 기록(맛집/장소 등) 이미지 업로드
//  - form-data: { file: File }
// ---------------------------------------------------------------------------
router.post(
  '/taste-records',
  authRequired,
  uploadTasteRecords.single('file'), // 프론트에서 formData.append("file", ...) 로 보낼 것
  (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json({ ok: false, error: 'NO_FILE' });
      }

      // 프론트에서 접근 가능한 공개 URL (/uploads/.. 로 매핑됨)
      const publicUrl = `/uploads/taste-records/${req.file.filename}`;

      return res.status(201).json({
        ok: true,
        url: publicUrl,
      });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// [POST] /api/uploads/guilds
//  - 탐험가 연맹(길드) 이미지 업로드
//  - form-data: { file: File }
// ---------------------------------------------------------------------------
router.post(
  '/guilds',
  authRequired,
  uploadGuilds.single('file'), // 프론트에서 formData.append("file", ...) 로 보낼 것
  (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json({ ok: false, error: 'NO_FILE' });
      }

      // 프론트에서 접근 가능한 공개 URL (/uploads/.. 로 매핑됨)
      const publicUrl = `/uploads/guilds/${req.file.filename}`;

      return res.status(201).json({
        ok: true,
        url: publicUrl,
      });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/uploads/guild-records
router.post(
  "/guild-records",
  authRequired,
  uploadGuildRecords.single("file"), // 프론트에서 formData.append("file", ...) 로 보낼 예정
  (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json({ ok: false, error: "NO_FILE" });
      }

      // 프론트에서 접근 가능한 공개 URL (/uploads/.. 로 매핑 예정)
      const publicUrl = `/uploads/guild-records/${req.file.filename}`;

      return res.status(201).json({
        ok: true,
        url: publicUrl,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;