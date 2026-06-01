/**
 * Fila de escrita com concorrência limitada (evita lock no Windows).
 */

import fs from 'fs';
import path from 'path';

function sleepMs(ms: number) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    /* sync */
  }
}

export function atomicWriteFile(
  filePath: string,
  body: string,
  retries = 8
): void {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `._tmp_${path.basename(filePath)}_${process.pid}_${Date.now()}`);
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      fs.writeFileSync(tmp, body, 'utf8');
      if (fs.existsSync(filePath)) {
        try {
          fs.renameSync(tmp, filePath);
        } catch {
          fs.copyFileSync(tmp, filePath);
          try {
            fs.unlinkSync(tmp);
          } catch {
            /* ignore */
          }
        }
      } else {
        fs.renameSync(tmp, filePath);
      }
      return;
    } catch (e) {
      try {
        if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
      } catch {
        /* ignore */
      }
      if (attempt === retries - 1) throw e;
      sleepMs(120 * (attempt + 1));
    }
  }
}

type WriteJob = () => Promise<void> | void;

export class WriteQueue {
  private queue: WriteJob[] = [];
  private active = 0;
  private drainResolve: (() => void) | null = null;

  constructor(private readonly maxConcurrency = 2) {}

  enqueue(job: WriteJob): void {
    this.queue.push(job);
    this.pump();
  }

  enqueueJson(filePath: string, data: unknown, pretty = false): void {
    const body = (pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data)) + (pretty ? '\n' : '');
    this.enqueue(() => atomicWriteFile(filePath, body));
  }

  private pump() {
    while (this.active < this.maxConcurrency && this.queue.length) {
      const job = this.queue.shift()!;
      this.active++;
      Promise.resolve()
        .then(() => job())
        .catch((e) => console.warn('⚠️ writeQueue:', (e as Error).message))
        .finally(() => {
          this.active--;
          if (this.queue.length) this.pump();
          else if (this.drainResolve && this.active === 0) {
            this.drainResolve();
            this.drainResolve = null;
          }
        });
    }
  }

  async drain(): Promise<void> {
    if (this.active === 0 && this.queue.length === 0) return;
    return new Promise((resolve) => {
      this.drainResolve = resolve;
      this.pump();
    });
  }
}
