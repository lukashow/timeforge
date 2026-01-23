/**
 * OR-Tools Solver Runner
 * Calls the Python OR-Tools solver and returns results
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface SolverInput {
  num_classes: number;
  num_teachers: number;
  num_subjects: number;
  num_rooms: number;
  num_periods_per_day: number;
  num_days: number;
  class_subject_periods: number[][];
  teacher_for_class_subject: number[][];
  teacher_unavailable?: boolean[][][];
  subject_needs_lab?: boolean[];
  subject_is_hard?: boolean[];
  subject_is_pe?: boolean[];
  room_is_lab?: boolean[];
  slot_is_break?: boolean[][];
  MAX_TEACHER_CONSECUTIVE: number;
  FLAG_NO_CONSECUTIVE_SAME_SUBJECT: boolean;
  FLAG_DOUBLE_PERIOD_NO_RECESS: boolean;
  FLAG_MINIMIZE_TEACHER_GAPS: boolean;
  timeout_seconds?: number;
}

export interface TimetableEntry {
  class: number;
  day: number;
  period: number;
  subject: number;
  teacher: number;
}

export interface SolverResult {
  status: string;
  solve_time_seconds: number;
  timetable: TimetableEntry[];
  total_gaps: number | null;
  success: boolean;
  error?: string;
}

const SOLVER_PATH = path.join(__dirname, 'solver.py');

/**
 * Run the OR-Tools solver with the given input
 */
export async function runSolver(input: SolverInput): Promise<SolverResult> {
  // Create temp directory and files
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ortools-'));
  const inputPath = path.join(tempDir, 'input.json');
  const outputPath = path.join(tempDir, 'output.json');

  try {
    // Write input to temp file
    fs.writeFileSync(inputPath, JSON.stringify(input, null, 2));

    console.log(`OR-Tools solver: ${input.num_classes} classes, ${input.num_teachers} teachers`);
    console.log(`Flags: consecutive=${input.FLAG_NO_CONSECUTIVE_SAME_SUBJECT}, ` +
                `max_teacher=${input.MAX_TEACHER_CONSECUTIVE}, ` +
                `double_break=${input.FLAG_DOUBLE_PERIOD_NO_RECESS}, ` +
                `minimize_gaps=${input.FLAG_MINIMIZE_TEACHER_GAPS}`);

    // Run Python solver using local .venv
    const venvPython = path.join(path.dirname(SOLVER_PATH), '.venv', 'bin', 'python');
    
    // Fallback to system python if venv not found (though init_setup.sh should have created it)
    const pythonExec = fs.existsSync(venvPython) ? venvPython : 'python3';

    if (!fs.existsSync(venvPython)) {
      console.warn(`[OR-Tools] Warning: Virtual environment not found at ${venvPython}. Using system python.`);
    }

    const result = await new Promise<SolverResult>((resolve, reject) => {
      const proc = spawn(pythonExec, [SOLVER_PATH, inputPath, outputPath], {
        cwd: path.dirname(SOLVER_PATH),
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
        console.log('[OR-Tools]', data.toString().trim());
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
        console.error('[OR-Tools Error]', data.toString().trim());
      });

      proc.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Solver exited with code ${code}: ${stderr}`));
          return;
        }

        try {
          const output = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
          resolve(output);
        } catch (err) {
          reject(new Error(`Failed to parse solver output: ${err}`));
        }
      });

      proc.on('error', (err) => {
        reject(err);
      });
    });

    return result;

  } finally {
    // Cleanup temp files
    try {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      fs.rmdirSync(tempDir);
    } catch {
      // Ignore cleanup errors
    }
  }
}
