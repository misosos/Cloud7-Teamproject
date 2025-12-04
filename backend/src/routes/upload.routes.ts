// backend/src/routes/upload.routes.ts
import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import authRequired from "../middlewares/authRequired";

// 업로드될 실제 디렉터리 경로 (…/backend/uploads/taste-records)
const tasteRecordsUploadDir = path.resolve(__dirname, "..", "..", "uploads", "taste-records");
fs.mkdirSync(tasteRecordsUploadDir, { recursive: true });

// 연맹 이미지 업로드 디렉터리 경로
const guildsUploadDir = path.resolve(__dirname, "..", "..", "uploads", "guilds");
fs.mkdirSync(guildsUploadDir, { recursive: true });

// 파일 저장 방식 설정 (taste-records용)
const tasteRecordsStorage = multer.diskStorage({
  // 파일이 저장될 폴더
  destination: (_req, _file, cb) => {
    cb(null, tasteRecordsUploadDir);
  },
  // 저장될 파일명 규칙
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname); // .jpg, .png 등
    const base = path.basename(file.originalname, ext);
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${base}-${unique}${ext}`);
  },
});

// 파일 저장 방식 설정 (guilds용)
const guildsStorage = multer.diskStorage({
  // 파일이 저장될 폴더
  destination: (_req, _file, cb) => {
    cb(null, guildsUploadDir);
  },
  // 저장될 파일명 규칙
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname); // .jpg, .png 등
    const base = path.basename(file.originalname, ext);
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${base}-${unique}${ext}`);
  },
});

const uploadTasteRecords = multer({ storage: tasteRecordsStorage });
const uploadGuilds = multer({ storage: guildsStorage });
const router = Router();

// POST /api/uploads/taste-records
router.post(
  "/taste-records",
  authRequired,
  uploadTasteRecords.single("file"), // 프론트에서 formData.append("file", ...) 로 보낼 예정
  (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json({ ok: false, error: "NO_FILE" });
      }

      // 프론트에서 접근 가능한 공개 URL (/uploads/.. 로 매핑 예정)
      const publicUrl = `/uploads/taste-records/${req.file.filename}`;

      return res.status(201).json({
        ok: true,
        url: publicUrl,
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/uploads/guilds
router.post(
  "/guilds",
  authRequired,
  uploadGuilds.single("file"), // 프론트에서 formData.append("file", ...) 로 보낼 예정
  (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json({ ok: false, error: "NO_FILE" });
      }

      // 프론트에서 접근 가능한 공개 URL (/uploads/.. 로 매핑 예정)
      const publicUrl = `/uploads/guilds/${req.file.filename}`;

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