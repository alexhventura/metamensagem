import fs from 'fs';
import path from 'path';

export interface BatchCheckpoint {
  source: 'citei-json' | 'citei-api' | 'csv';
  filePath?: string;
  offset: number;
  totalPersisted: number;
  totalRead: number;
  batchNum: number;
  updatedAt: string;
}

export function loadCheckpoint(statePath: string): BatchCheckpoint | null {
  if (!fs.existsSync(statePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf8')) as BatchCheckpoint;
  } catch {
    return null;
  }
}

export function saveCheckpoint(statePath: string, state: BatchCheckpoint): void {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
}
