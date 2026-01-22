import { Router } from "express";
import healthRouter from "./health.ts";
import subjectsRouter from "./subjects.ts";
import teachersRouter from "./teachers.ts";
import roomsRouter from "./rooms.ts";
import disciplinesRouter from "./disciplines.ts";
import classesRouter from "./classes.ts";
import assignmentsRouter from "./assignments.ts";
import timeGridRouter from "./time-grid.ts";
import timetableRouter from "./timetable.ts";
import excelRouter from "./excel.ts";
import generationRouter from "./generation.ts";
import authRouter from "./auth.ts";

const router = Router();

// Health check
router.use("/health", healthRouter);

// Auth routes
router.use("/api/auth", authRouter);

// API routes
router.use("/api/subjects", subjectsRouter);
router.use("/api/teachers", teachersRouter);
router.use("/api/rooms", roomsRouter);
router.use("/api/disciplines", disciplinesRouter);
router.use("/api/classes", classesRouter);
router.use("/api/assignments", assignmentsRouter);
router.use("/api/time-grid", timeGridRouter);
router.use("/api/timetable", timetableRouter);
router.use("/api/excel", excelRouter);
router.use("/api/generation", generationRouter);

export default router;
