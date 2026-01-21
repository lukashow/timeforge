/**
 * MiniZinc CLI Runner
 * Spawns `minizinc` CLI directly to enable parallel threads (-p flag)
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface MiniZincOptions {
  solver?: string;           // Default: 'gecode'
  timeLimit?: number;        // In milliseconds
  threads?: number;          // Number of parallel threads
  intermediate?: boolean;    // Print intermediate solutions
}

export interface MiniZincResult {
  status: 'OPTIMAL_SOLUTION' | 'SATISFIED' | 'UNSATISFIABLE' | 'UNBOUNDED' | 'UNKNOWN' | 'ERROR';
  solution?: Record<string, unknown>;
  rawOutput?: string;
  solveTimeMs: number;
  error?: string;
}

/**
 * Run MiniZinc solver via CLI with parallel thread support
 */
export async function runMiniZinc(
  modelPath: string,
  data: Record<string, unknown>,
  options: MiniZincOptions = {}
): Promise<MiniZincResult> {
  const {
    solver = 'gecode',
    timeLimit = 60000,
    threads = 1, // TEST: Memory leak Issue
    intermediate = false,
  } = options;

  // Create temp directory and data file
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'minizinc-'));
  const dataPath = path.join(tempDir, 'data.json');
  
  const startTime = Date.now();

  try {
    // Write data to JSON file
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

    // Build command arguments
    const args: string[] = [
      '--solver', solver,
      '-p', String(threads),
      '--time-limit', String(timeLimit),
      '--json-stream',
    ];

    if (intermediate) {
      args.push('--intermediate');
    }

    args.push(modelPath, dataPath);

    console.log(`MiniZinc CLI: minizinc ${args.join(' ')}`);
    console.log(`Using ${threads} parallel threads for solving`);

    // Spawn minizinc process
    const result = await new Promise<MiniZincResult>((resolve) => {
      const proc = spawn('minizinc', args);
      
      let stdout = '';
      let stderr = '';
      let lastSolution: Record<string, unknown> | undefined;
      let status: MiniZincResult['status'] = 'UNKNOWN';

      proc.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString();
        
        // Parse JSON stream lines
        const lines = stdout.split('\n');
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line);
            if (msg.type === 'solution') {
              // Parse the embedded JSON from "default" output
              if (msg.output?.default) {
                try {
                  lastSolution = JSON.parse(msg.output.default);
                } catch {
                  lastSolution = { raw: msg.output.default };
                }
              }
            } else if (msg.type === 'status') {
              status = msg.status;
            } else if (msg.type === 'error') {
              status = 'ERROR';
            }
          } catch {
            // Not valid JSON line, ignore
          }
        }
      });

      proc.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      proc.on('close', (code) => {
        const solveTimeMs = Date.now() - startTime;
        
        if (code !== 0 && status === 'UNKNOWN') {
          resolve({
            status: 'ERROR',
            error: stderr || `Process exited with code ${code}`,
            solveTimeMs,
            rawOutput: stdout,
          });
        } else {
          resolve({
            status,
            solution: lastSolution,
            solveTimeMs,
            rawOutput: stdout,
          });
        }
      });

      proc.on('error', (err) => {
        resolve({
          status: 'ERROR',
          error: err.message,
          solveTimeMs: Date.now() - startTime,
        });
      });
    });

    return result;

  } finally {
    // Cleanup temp files
    try {
      fs.unlinkSync(dataPath);
      fs.rmdirSync(tempDir);
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Get path to timetable.mzn model file
 */
export function getModelPath(): string {
  return path.join(__dirname, 'timetable.mzn');
}
