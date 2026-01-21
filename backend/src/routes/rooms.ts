import { Router } from "express";
import type { Request, Response } from "express";
import { pb } from "@/lib/pocketbase.ts";
import type { RoomRecord } from "@/types/pocketbase.d.ts";

const router = Router();

// GET /api/rooms - List all rooms
router.get("/", async (_req: Request, res: Response) => {
  try {
    const records = await pb.collection("rooms").getFullList<RoomRecord>({
      sort: "name",
      requestKey: null,
    });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch rooms" });
  }
});

// GET /api/rooms/:id - Get single room
router.get("/:id", async (req: Request<{ id: string }>, res: Response) => {
  try {
    const record = await pb.collection("rooms").getOne<RoomRecord>(req.params.id);
    res.json(record);
  } catch (error) {
    res.status(404).json({ error: "Room not found" });
  }
});

// POST /api/rooms - Create room
router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, tags } = req.body;
    const record = await pb.collection("rooms").create<RoomRecord>({
      name,
      tags: tags || [],
    });
    res.status(201).json(record);
  } catch (error) {
    res.status(400).json({ error: "Failed to create room" });
  }
});

// POST /api/rooms/bulk - Create multiple rooms
router.post("/bulk", async (req: Request, res: Response) => {
  try {
    const { prefix, startNum, endNum, tags } = req.body;
    const rooms: RoomRecord[] = [];
    
    for (let i = startNum; i <= endNum; i++) {
      const record = await pb.collection("rooms").create<RoomRecord>({
        name: `${prefix}${i}`,
        tags: tags || [],
      });
      rooms.push(record);
    }
    
    res.status(201).json(rooms);
  } catch (error) {
    res.status(400).json({ error: "Failed to create rooms" });
  }
});

// PUT /api/rooms/:id - Update room
router.put("/:id", async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { name, tags } = req.body;
    const record = await pb.collection("rooms").update<RoomRecord>(req.params.id, {
      name,
      tags,
    });
    res.json(record);
  } catch (error) {
    res.status(400).json({ error: "Failed to update room" });
  }
});

// DELETE /api/rooms/:id - Delete room
router.delete("/:id", async (req: Request<{ id: string }>, res: Response) => {
  try {
    await pb.collection("rooms").delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: "Failed to delete room" });
  }
});

export default router;
