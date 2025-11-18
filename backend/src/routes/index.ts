// src/routes/index.ts
import { Router } from "express";

import auth from "./auth.routes";
import health from "./health.routes";
import directions from "./directions.routes"; // ✅ 새로 만든 라우터

const router = Router();

router.use("/auth", auth);
router.use("/health", health);
router.use("/directions", directions); // ✅ /api/directions/* 로 연결

export default router;
