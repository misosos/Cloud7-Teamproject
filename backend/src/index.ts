import express from "express";
import cors from "cors";
import morgan from "morgan";

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// routes
app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/api/tastes", (_req, res) => res.json([{ id: 1, title: "test taste" }]));
app.get("/api/guilds", (_req, res) => res.json([{ id: 1, name: "test guild" }]));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Backend running on port ${PORT}`));
