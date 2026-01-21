import { Router } from "express";
import type { Request, Response } from "express";
import { pb } from "@/lib/pocketbase.ts";
import type { SubjectRecord, TeacherRecord, RoomRecord } from "@/types/pocketbase.d.ts";
import * as XLSX from "xlsx";

const router = Router();

// Helper to create Excel buffer
function createExcelBuffer(headers: string[], sampleRows: string[][], sheetName: string): Buffer {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

// GET /api/excel/template/subjects - Download subjects template
router.get("/template/subjects", (_req: Request, res: Response) => {
  const headers = ["科目名称", "简称", "颜色(HEX)", "需要实验室(是/否)"];
  const sampleRows = [
    ["语文", "语", "#8B5CF6", "否"],
    ["数学", "数", "#3B82F6", "否"],
    ["英语", "英", "#10B981", "否"],
    ["物理", "物", "#F59E0B", "是"],
    ["化学", "化", "#EF4444", "是"],
    ["生物", "生", "#06B6D4", "是"],
  ];
  
  const buffer = createExcelBuffer(headers, sampleRows, "科目");
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", "attachment; filename=subjects_template.xlsx");
  res.send(buffer);
});

// GET /api/excel/template/teachers - Download teachers template
router.get("/template/teachers", (_req: Request, res: Response) => {
  const headers = ["教师姓名", "任教科目", "周课时负载"];
  const sampleRows = [
    ["张三", "语文", "25"],
    ["李四", "数学", "20"],
    ["王五", "英语", "22"],
  ];
  
  const buffer = createExcelBuffer(headers, sampleRows, "教师");
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", "attachment; filename=teachers_template.xlsx");
  res.send(buffer);
});

// GET /api/excel/template/rooms - Download rooms template
router.get("/template/rooms", (_req: Request, res: Response) => {
  const headers = ["教室名称", "标签(逗号分隔)"];
  const sampleRows = [
    ["A101", "普通教室"],
    ["A102", "普通教室"],
    ["B201", "物理实验室,实验室"],
    ["B202", "化学实验室,实验室"],
    ["C301", "计算机房,机房"],
  ];
  
  const buffer = createExcelBuffer(headers, sampleRows, "教室");
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", "attachment; filename=rooms_template.xlsx");
  res.send(buffer);
});

// POST /api/excel/import/subjects - Import subjects from Excel
router.post("/import/subjects", async (req: Request, res: Response) => {
  try {
    if (!req.body || !req.body.data) {
      return res.status(400).json({ error: "No data provided" });
    }
    
    const rows = req.body.data as string[][];
    const results: { success: SubjectRecord[]; errors: { row: number; error: string }[] } = {
      success: [],
      errors: []
    };
    
    // Skip header row
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 2 || !row[0]?.trim()) continue;
      
      try {
        const record = await pb.collection("subjects").create<SubjectRecord>({
          name: row[0]?.trim(),
          shortName: row[1]?.trim() || row[0]?.substring(0, 2),
          color: row[2]?.trim() || "#8B5CF6",
          requiresLab: row[3]?.trim() === "是",
        });
        results.success.push(record);
      } catch (err) {
        results.errors.push({ row: i + 1, error: `导入失败: ${row[0]}` });
      }
    }
    
    res.json(results);
  } catch (error) {
    res.status(400).json({ error: "Failed to import subjects" });
  }
});

// POST /api/excel/import/teachers - Import teachers from Excel
router.post("/import/teachers", async (req: Request, res: Response) => {
  try {
    if (!req.body || !req.body.data) {
      return res.status(400).json({ error: "No data provided" });
    }
    
    const rows = req.body.data as string[][];
    const subjectName = req.body.subjectMapping as Record<string, string> || {};
    
    // Get all subjects for name-to-id mapping
    const subjects = await pb.collection("subjects").getFullList<SubjectRecord>({ requestKey: null });
    const subjectMap = new Map(subjects.map(s => [s.name, s.id]));
    
    const results: { success: TeacherRecord[]; errors: { row: number; error: string }[] } = {
      success: [],
      errors: []
    };
    
    // Skip header row
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 2 || !String(row[0] || '').trim()) continue;
      
      const subjectNameValue = String(row[1] || '').trim();
      const subjectId = subjectMap.get(subjectNameValue);
      
      if (!subjectId) {
        results.errors.push({ row: i + 1, error: `科目不存在: ${subjectNameValue}` });
        continue;
      }
      
      try {
        console.log(`Creating teacher: ${row[0]}, subject: ${subjectId}, load: ${row[2]}`);
        // Excel returns numbers as numbers, not strings - convert before using
        const weeklyLoadValue = typeof row[2] === 'number' ? row[2] : parseInt(String(row[2] || '25').trim()) || 25;
        const record = await pb.collection("teachers").create<TeacherRecord>({
          name: String(row[0] || '').trim(),
          subject: subjectId,
          weeklyLoad: weeklyLoadValue,
          unavailable: [],
        });
        console.log(`Success: ${record.id}`);
        results.success.push(record);
      } catch (err: unknown) {
        console.error(`Failed to create teacher ${row[0]}:`, err);
        // PocketBase errors have a specific structure
        let errMsg = 'Unknown error';
        if (err && typeof err === 'object') {
          const pbErr = err as { message?: string; data?: Record<string, unknown>; response?: { data?: Record<string, unknown> } };
          if (pbErr.response?.data) {
            errMsg = JSON.stringify(pbErr.response.data);
          } else if (pbErr.data) {
            errMsg = JSON.stringify(pbErr.data);
          } else if (pbErr.message) {
            errMsg = pbErr.message;
          } else {
            errMsg = JSON.stringify(err);
          }
        }
        results.errors.push({ row: i + 1, error: `导入失败: ${row[0]} - ${errMsg}` });
      }
    }
    
    res.json(results);
  } catch (error) {
    res.status(400).json({ error: "Failed to import teachers" });
  }
});

// POST /api/excel/import/rooms - Import rooms from Excel
router.post("/import/rooms", async (req: Request, res: Response) => {
  try {
    if (!req.body || !req.body.data) {
      return res.status(400).json({ error: "No data provided" });
    }
    
    const rows = req.body.data as string[][];
    const results: { success: RoomRecord[]; errors: { row: number; error: string }[] } = {
      success: [],
      errors: []
    };
    
    // Skip header row
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 1 || !row[0]?.trim()) continue;
      
      try {
        const tags = row[1]?.trim()?.split(",").map(t => t.trim()).filter(Boolean) || [];
        const record = await pb.collection("rooms").create<RoomRecord>({
          name: row[0]?.trim(),
          tags,
        });
        results.success.push(record);
      } catch (err) {
        results.errors.push({ row: i + 1, error: `导入失败: ${row[0]}` });
      }
    }
    
    res.json(results);
  } catch (error) {
    res.status(400).json({ error: "Failed to import rooms" });
  }
});

export default router;
