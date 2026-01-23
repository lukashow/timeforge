import { Router } from "express";
import type { Request, Response } from "express";
import { pb } from "@/lib/pocketbase.ts";
import PDFDocument from "pdfkit-table";

const router = Router();

// Helper to get color for subject
const getSubjectColor = (subjectId: string, subjects: any[]) => {
  const subject = subjects.find(s => s.id === subjectId);
  return subject?.color || '#E5E7EB';
};

// Helper to get hex color components
const hexToRgb = (hex: string): [number, number, number] => {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
  const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
  const b = parseInt(cleanHex.substring(4, 6), 16) || 0;
  return [r, g, b];
};

// Helper to lighten color (similar to frontend opacity)
const lightenColor = (hex: string, factor: number = 0.85) => {
  const [r, g, b] = hexToRgb(hex);
  const newR = Math.round(r + (255 - r) * factor);
  const newG = Math.round(g + (255 - g) * factor);
  const newB = Math.round(b + (255 - b) * factor);
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
};

// POST /api/export/pdf - Generate PDF timetable
router.post("/pdf", async (req: Request, res: Response) => {
  try {
    const { type, id, language = 'zh' } = req.body; // type: 'class' | 'teacher', id: target id
    
    // Fetch necessary data
    const [classes, subjects, teachers, timeGrid] = await Promise.all([
      pb.collection("classes").getFullList({ requestKey: null }),
      pb.collection("subjects").getFullList({ requestKey: null }),
      pb.collection("teachers").getFullList({ requestKey: null }),
      pb.collection("time_grid").getFullList({ requestKey: null }),
    ]);

    // Get time grid config
    const gridConfig = timeGrid[0] as any || {};
    const maxPeriods = gridConfig.periodsPerDay || 8;
    const breaks = (gridConfig.breaks || []).map((b: { afterPeriod: number; name: string; duration: number }) => ({
      afterPeriod: b.afterPeriod,
      name: b.name,
      duration: b.duration
    }));

    // Get timetable entries
    let entries: any[] = [];
    if (type === 'class') {
      entries = await pb.collection("timetable_entries").getFullList({
        filter: `class_id = "${id}"`,
        sort: 'day,period',
        requestKey: null,
      });
    } else if (type === 'teacher') {
      entries = await pb.collection("timetable_entries").getFullList({
        filter: `teacher_id = "${id}"`,
        sort: 'day,period',
        requestKey: null,
      });
    }

    // Get target name
    let title = "";
    if (type === 'class') {
      const cls = classes.find(c => c.id === id);
      title = cls ? `${cls.name} ${language === 'zh' ? '班级课表' : 'Class Timetable'}` : "Timetable";
    } else {
      const teacher = teachers.find(t => t.id === id);
      title = teacher ? `${teacher.name} ${language === 'zh' ? '教师课表' : 'Teacher Timetable'}` : "Timetable";
    }

    // Create PDF
    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });

    // Register font
    const fontPath = "assets/fonts/SourceHanSansSC-Regular.otf";
    doc.registerFont('NotoSansSC', fontPath);
    doc.font('NotoSansSC');

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="timetable.pdf"`);
    
    doc.pipe(res);
    
    // Check if we need Chinese font (simplified approach: use standard font if English, otherwise warn/fallback)
    // In a real production app with Chinese, we MUST load a font file.
    // Assuming for now user system might not have the font file locally available for server side.
    // We will try to use a standard font but Chinese characters might not render without a font file.
    // ALERT: PDFKit requires a font file for non-ASCII characters. 
    // Since I cannot upload a font file easily, I will implement standard layout logic 
    // but Chinese text will appear as squares if font is missing. 
    // I should register a font if available. Checking system fonts...
    // For this environment, I'll try to find a font or default to Helvetica (which won't show Chinese).
    // Let's assume for this step we structure the PDF. If Chinese is needed, I must know where font is.
    // I'll try to use a bundled font if I can, but standard PDFKit has limited fonts.
    // I will proceed with logic and assume the user might need to supply a font path or I use English labels for now if risky.
    // Wait, the user explicitly asked for "original design".
    
    // Title
    doc.fontSize(20).text(title, { align: 'center' });
    doc.moveDown();

    // Table Table
    const tableData = [];
    
    // Headers
    const days = language === 'zh' 
      ? ['周一', '周二', '周三', '周四', '周五']
      : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      
    const headers = [language === 'zh' ? '节次' : 'Period', ...days];

    // Build rows
    for (let p = 1; p <= maxPeriods; p++) {
      const row = [p.toString()];
      
      for (let d = 1; d <= 5; d++) {
        const entry = entries.find(e => e.day === d && e.period === p);
        if (entry) {
          if (entry.static_name && !entry.subject_id) {
            row.push(entry.static_name);
          } else if (entry.subject_id) {
            const subject = subjects.find(s => s.id === entry.subject_id);
            const entryTeacher = teachers.find(t => t.id === entry.teacher_id);
            const entryClass = classes.find(c => c.id === entry.class_id);
            
            let cellText = subject?.name || '';
            if (type === 'class' && entryTeacher) {
              cellText += `\n(${entryTeacher.name})`;
            } else if (type === 'teacher' && entryClass) {
              cellText += `\n(${entryClass.name})`;
            }
            row.push(cellText);
          } else {
            row.push('');
          }
        } else {
          row.push('');
        }
      }
      tableData.push(row);

      // Add break row if needed
      const breakInfo = breaks.find((b: { afterPeriod: number }) => b.afterPeriod === p);
      if (breakInfo) {
        tableData.push([
          'BREAK', 
          `${breakInfo.name} (${breakInfo.duration} min)`, 
          '', '', '', ''
        ]); // Spanning logic handled differently in pdfkit-table usually, simpler to just add row
      }
    }

    // PDFKit-Table is good but requires specific structure.
    // Since we need custom styling (colors), using strict table plugin might be rigid.
    // But it's better than manual drawing for now.
    // Let's use simple table first. To support colors, we need deeper customization 
    // or draw manually.
    
    // Given the request for "maintain original design" which implies COLORS,
    // manual grid drawing is safer than pdfkit-table for cell-specific background colors.
    
    const startX = 30;
    const startY = doc.y + 10;
    const cellWidth = (doc.page.width - 60) / 6; // 1 header col + 5 days
    const cellHeight = 40;
    
    // Draw Headers
    days.unshift(language === 'zh' ? '节次' : 'Period');
    doc.fontSize(12);
    
    days.forEach((day, i) => {
      doc.fillColor('#F3F4F6').rect(startX + (i * cellWidth), startY, cellWidth, 30).fill();
      doc.fillColor('#000000').text(day, startX + (i * cellWidth), startY + 8, { width: cellWidth, align: 'center' });
    });

    let currentY = startY + 30;

    // Draw Grid
    for (let p = 1; p <= maxPeriods; p++) {
      const breakInfo = breaks.find((b: { afterPeriod: number }) => b.afterPeriod === p);

      // Check if we need a new page
      if (currentY + cellHeight + (breakInfo ? 25 : 0) > doc.page.height - 50) {
        doc.addPage();
        currentY = 50; // Reset Y with top margin
        
        // Redraw Headers on new page
        days.forEach((day, i) => {
          doc.fillColor('#F3F4F6').rect(startX + (i * cellWidth), 20, cellWidth, 30).fill();
          doc.fillColor('#000000').text(day, startX + (i * cellWidth), 28, { width: cellWidth, align: 'center' });
        });
        currentY += 30; // Move past headers
      }

      // Period Num Cell
      doc.fillColor('#F9FAFB').rect(startX, currentY, cellWidth, cellHeight).fill();
      doc.fillColor('#6B7280').text(`${language === 'zh' ? '第' : 'P'}${p}${language === 'zh' ? '节' : ''}`, startX, currentY + 12, { width: cellWidth, align: 'center' });

      // Days
      for (let d = 1; d <= 5; d++) {
        const x = startX + (d * cellWidth);
        const entry = entries.find(e => e.day === d && e.period === p);
        
        // Default clean background
        let bgColor = '#FFFFFF';
        let textColor = '#000000';
        let mainText = '';
        let subText = '';
        let accentColor = '#E5E7EB';

        if (entry) {
          if (entry.static_name && !entry.subject_id) {
            bgColor = '#374151';
            textColor = '#FFFFFF';
            mainText = entry.static_name;
            subText = language === 'zh' ? '固定课程' : 'Static';
          } else if (entry.subject_id) {
            const subject = subjects.find(s => s.id === entry.subject_id);
            if (subject) {
              accentColor = subject.color; // The border/strong color
              bgColor = lightenColor(subject.color, 0.9); // Very light background
              textColor = '#111827';
              mainText = subject.name;
              
              if (type === 'class') {
                const tInfo = teachers.find(t => t.id === entry.teacher_id);
                subText = tInfo ? tInfo.name : '';
              } else {
                const cInfo = classes.find(c => c.id === entry.class_id);
                subText = cInfo ? cInfo.name : '';
              }
            }
          }
        }

        // Fill background
        if (bgColor !== '#FFFFFF') {
          doc.fillColor(bgColor).rect(x, currentY, cellWidth, cellHeight).fill();
        }
        
        // Draw left border if subject
        if (mainText && textColor !== '#FFFFFF') {
           doc.fillColor(accentColor).rect(x, currentY, 4, cellHeight).fill();
        }

        // Text
        if (mainText) {
          doc.fillColor(textColor).fontSize(10).text(mainText, x + 8, currentY + 8, { width: cellWidth - 16, align: 'center' });
          if (subText) {
             doc.fillColor(textColor === '#FFFFFF' ? '#D1D5DB' : '#6B7280')
                .fontSize(8)
                .text(subText, x + 8, currentY + 24, { width: cellWidth - 16, align: 'center' });
          }
        }
        
        // Cell Border
        doc.strokeColor('#E5E7EB').rect(x, currentY, cellWidth, cellHeight).stroke();
      }
      
      // Period Num Border
      doc.strokeColor('#E5E7EB').rect(startX, currentY, cellWidth, cellHeight).stroke();

      currentY += cellHeight;

      // Break
      if (breakInfo) {
        // Check if break fits
        if (currentY + 25 > doc.page.height - 50) {
           doc.addPage();
           currentY = 50; // Reset Y
           // Redraw Headers
           days.forEach((day, i) => {
             doc.fillColor('#F3F4F6').rect(startX + (i * cellWidth), 20, cellWidth, 30).fill();
             doc.fillColor('#000000').text(day, startX + (i * cellWidth), 28, { width: cellWidth, align: 'center' });
           });
           currentY += 30; 
        }

        doc.fillColor('#FFF7ED').rect(startX, currentY, doc.page.width - 60, 25).fill();
        doc.fillColor('#C2410C').fontSize(10)
           .text(`${breakInfo.name} (${breakInfo.duration} min)`, startX, currentY + 7, { width: doc.page.width - 60, align: 'center' });
        currentY += 25;
      }
    }

    doc.end();
  } catch (error) {
    console.error("PDF generation failed:", error);
    res.status(500).json({ error: "Failed to generate PDF" });
  }
});

export default router;
