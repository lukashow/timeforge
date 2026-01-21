import { Router } from "express";
import type { Request, Response } from "express";
import { pb } from "@/lib/pocketbase.ts";

const router = Router();

interface HealthResponse {
  status: "ok" | "error";
  timestamp: string;
  pocketbase: {
    connected: boolean;
    url: string;
  };
}

/**
 * Health check endpoint
 * Returns server status and PocketBase connection status
 */
router.get("/", async (_req: Request, res: Response<HealthResponse>) => {
  let pbConnected = false;

  try {
    // Check PocketBase health
    await pb.health.check();
    pbConnected = true;
  } catch {
    // PocketBase not available
    pbConnected = false;
  }

  const response: HealthResponse = {
    status: "ok",
    timestamp: new Date().toISOString(),
    pocketbase: {
      connected: pbConnected,
      url: pb.baseURL,
    },
  };

  res.json(response);
});

export default router;
