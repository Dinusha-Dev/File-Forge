import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const TMP_DIR = path.join(os.tmpdir(), "universal-file-hub");
const MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

// Ensure tmp directory exists
if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

// Auto-cleanup: every 5 minutes, delete files older than 1 hour
if (typeof global !== "undefined" && !(global as Record<string, unknown>).__tmpCleanupStarted) {
  (global as Record<string, unknown>).__tmpCleanupStarted = true;
  setInterval(() => {
    try {
      const now = Date.now();
      const entries = fs.readdirSync(TMP_DIR);
      for (const entry of entries) {
        const fullPath = path.join(TMP_DIR, entry);
        const stat = fs.statSync(fullPath);
        if (now - stat.mtimeMs > MAX_AGE_MS) {
          if (stat.isDirectory()) {
            fs.rmSync(fullPath, { recursive: true, force: true });
          } else {
            fs.unlinkSync(fullPath);
          }
        }
      }
    } catch {
      // Non-fatal: cleanup errors are ignored
    }
  }, 5 * 60 * 1000);
}

export function writeTempFile(jobId: string, filename: string, data: Buffer): string {
  const dir = path.join(TMP_DIR, jobId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, data);
  return filePath;
}

export function readTempFile(jobId: string, filename: string): Buffer | null {
  const filePath = path.join(TMP_DIR, jobId, filename);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath);
}

export function listTempFiles(jobId: string): string[] {
  const dir = path.join(TMP_DIR, jobId);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir);
}

export function deleteTempJob(jobId: string): void {
  const dir = path.join(TMP_DIR, jobId);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export function getTmpDir(): string {
  return TMP_DIR;
}
