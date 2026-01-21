import { Router } from "express";
import type { Request, Response } from "express";
import { pb } from "@/lib/pocketbase.ts";
import type { TimeGridRecord } from "@/types/pocketbase.d.ts";

const router = Router();

// Default time grid configuration
const defaultTimeGrid = {
  workDays: 5,
  periodsPerDay: 8,
  breaks: [
    { id: "1", name: "大课间", duration: 20, isHard: true, afterPeriod: 2 },
    { id: "2", name: "午餐", duration: 60, isHard: true, afterPeriod: 4 },
  ],
  daySchedules: {},
  selectedDays: [0, 1, 2, 3, 4], // Mon-Fri
  schoolStartDate: "2026-09-01",
  schoolStartTime: "08:00",
  minutesPerPeriod: 45,
};

// GET /api/time-grid - Get current time grid config
router.get("/", async (_req: Request, res: Response) => {
  try {
    // Try to get existing config
    const records = await pb.collection("time_grid").getFullList<TimeGridRecord>({ requestKey: null });
    
    if (records.length === 0) {
      // Return default if none exists
      res.json(defaultTimeGrid);
    } else {
      res.json(records[0]);
    }
  } catch (error) {
    // Collection might not exist, return default
    res.json(defaultTimeGrid);
  }
});

// PUT /api/time-grid - Update time grid config
router.put("/", async (req: Request, res: Response) => {
  try {
    const { 
      workDays, 
      periodsPerDay, 
      breaks, 
      daySchedules,
      selectedDays,
      schoolStartDate,
      schoolStartTime,
      minutesPerPeriod,
    } = req.body;
    
    // Try to get existing config
    const records = await pb.collection("time_grid").getFullList<TimeGridRecord>({ requestKey: null });
    
    const data = {
      workDays,
      periodsPerDay,
      breaks,
      daySchedules,
      selectedDays,
      schoolStartDate,
      schoolStartTime,
      minutesPerPeriod,
    };
    
    let record: TimeGridRecord;
    if (records.length === 0) {
      // Create new
      record = await pb.collection("time_grid").create<TimeGridRecord>(data);
    } else {
      // Update existing
      const existingId = records[0]?.id;
      if (!existingId) {
        throw new Error("No existing record ID");
      }
      record = await pb.collection("time_grid").update<TimeGridRecord>(existingId, data);
    }
    
    res.json(record);
  } catch (error) {
    console.error("Failed to update time grid:", error);
    res.status(400).json({ error: "Failed to update time grid", details: error });
  }
});

export default router;
