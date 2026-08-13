/**
 * Build de produção com logs por etapa (Vercel mostra onde falhou).
 */
import { spawnSync } from 'node:child_process';

const steps = [
  ['check-vercel-supabase-env', 'node', ['build-scripts/check-vercel-supabase-env.mjs']],
  ['build-frase-id-index', 'node', ['build-scripts/build-frase-id-index.mjs']],
  ['vite build', 'npx', ['vite', 'build']],
  ['sync-public-to-dist', 'node', ['build-scripts/sync-public-to-dist.mjs']],
  ['inject-prerender-shell', 'node', ['build-scripts/inject-prerender-shell.mjs']],
];

for (const [label, cmd, args] of steps) {
  console.log(`\n[build] ▶ ${label}`);
  const result = spawnSync(cmd, args, {
    stdio: 'inherit',
    env: process.env,
    shell: false,
  });
  if (result.status !== 0) {
    console.error(`\n[build] ✗ falhou em: ${label} (exit ${result.status ?? 1})`);
    process.exit(result.status ?? 1);
  }
  console.log(`[build] ✓ ${label}`);
}

console.log('\n[build] ✓ produção concluída');
