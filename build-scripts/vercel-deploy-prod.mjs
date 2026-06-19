#!/usr/bin/env node
/**
 * Deploy produção via Vercel CLI (requer VERCEL_TOKEN no ambiente).
 * Uso: VERCEL_TOKEN=xxx node scripts/vercel-deploy-prod.mjs
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const token = process.env.VERCEL_TOKEN?.trim();
if (!token) {
  console.error('Defina VERCEL_TOKEN (https://vercel.com/account/tokens)');
  process.exit(1);
}

const DEFAULT_PROJECT_ID = 'prj_aYRMEapfQ1y8KOu1ii2zDcCV1J8k';

const projectId =
  process.env.VERCEL_PROJECT_ID?.trim() ||
  (existsSync('.vercel/project.json')
    ? JSON.parse(readFileSync('.vercel/project.json', 'utf8')).projectId
    : DEFAULT_PROJECT_ID);

if (!projectId) {
  console.error('projectId ausente — .vercel/project.json ou VERCEL_PROJECT_ID');
  process.exit(1);
}

const scope = process.env.VERCEL_SCOPE?.trim() || 'quick-doc-test-s-projects';

const env = {
  ...process.env,
  VERCEL_TOKEN: token,
  VERCEL_ORG_ID: process.env.VERCEL_ORG_ID || '',
  VERCEL_PROJECT_ID: projectId,
};

function run(label, cmd, args) {
  console.log(`\n▶ ${label}`);
  const r = spawnSync(cmd, args, { stdio: 'inherit', env, shell: false });
  if (r.status !== 0) {
    console.error(`✗ ${label} (exit ${r.status ?? 1})`);
    process.exit(r.status ?? 1);
  }
}

run('whoami', 'npx', ['--yes', 'vercel@54.14.0', 'whoami']);
run('pull production settings', 'npx', [
  '--yes',
  'vercel@54.14.0',
  'pull',
  '--yes',
  '--environment=production',
  `--scope=${scope}`,
]);
run('build', 'npx', ['--yes', 'vercel@54.14.0', 'build', '--prod', `--scope=${scope}`]);
run('deploy prebuilt', 'npx', [
  '--yes',
  'vercel@54.14.0',
  'deploy',
  '--prebuilt',
  '--prod',
  `--scope=${scope}`,
  '--yes',
]);

console.log('\n✓ Deploy produção solicitado. Confira o dashboard Vercel.');
