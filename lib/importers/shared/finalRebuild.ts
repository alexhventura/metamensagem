/**
 * Rebuild final: metadata + prepare-data (+ migrate opcional).
 */

import { execSync } from 'child_process';

export function runFinalRebuild(cwd: string, options?: { skipMigrate?: boolean }): void {
  if (!options?.skipMigrate) {
    try {
      execSync('node scripts/migrate-all-frases.mjs', { cwd, stdio: 'inherit' });
    } catch {
      console.warn('⚠️ migrate-all-frases ignorado (lock ou já migrado).');
    }
  }
  execSync('node scripts/build-content-metadata.mjs', { cwd, stdio: 'inherit' });
  try {
    execSync('node prepare-data.cjs', { cwd, stdio: 'inherit' });
  } catch {
    console.warn('⚠️ prepare-data falhou; tentando índice a partir do CMS...');
    execSync('node scripts/rebuild-frases-index-from-cms.cjs', { cwd, stdio: 'inherit' });
  }
}
