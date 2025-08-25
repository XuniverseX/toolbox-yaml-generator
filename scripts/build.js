// Simple static build: copy required assets into dist/
// Keeps project offline-friendly without bundlers.
// Usage: node scripts/build.js

const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');

async function exists(p) {
  try { await fsp.access(p); return true; } catch { return false; }
}

async function rimraf(p) {
  if (!(await exists(p))) return;
  const stat = await fsp.lstat(p);
  if (stat.isDirectory() && !stat.isSymbolicLink()) {
    const entries = await fsp.readdir(p);
    for (const e of entries) {
      await rimraf(path.join(p, e));
    }
    await fsp.rmdir(p);
  } else {
    await fsp.unlink(p);
  }
}

async function ensureDir(p) {
  await fsp.mkdir(p, { recursive: true });
}

async function copyFile(src, dest) {
  await ensureDir(path.dirname(dest));
  await fsp.copyFile(src, dest);
}

async function copyDir(src, dest) {
  if (!(await exists(src))) return;
  const stat = await fsp.lstat(src);
  if (stat.isDirectory()) {
    await ensureDir(dest);
    const entries = await fsp.readdir(src);
    for (const entry of entries) {
      const s = path.join(src, entry);
      const d = path.join(dest, entry);
      await copyDir(s, d);
    }
  } else {
    await copyFile(src, dest);
  }
}

async function main() {
  console.log('[build] start');
  await rimraf(DIST);
  await ensureDir(DIST);

  const files = [
    'index.html'
  ];
  const folders = [
    'css',
    'js',
    'libs',
    'LICENSES'
  ];

  // Copy top-level files
  for (const f of files) {
    const src = path.join(ROOT, f);
    if (await exists(src)) {
      const dest = path.join(DIST, f);
      await copyFile(src, dest);
      console.log('[build] file', f);
    }
  }

  // Copy folders
  for (const dir of folders) {
    const src = path.join(ROOT, dir);
    if (await exists(src)) {
      const dest = path.join(DIST, dir);
      await copyDir(src, dest);
      console.log('[build] dir', dir);
    }
  }

  // Basic verification
  const distIndex = path.join(DIST, 'index.html');
  if (!(await exists(distIndex))) {
    throw new Error('index.html missing in dist. Build failed.');
  }

  console.log('[build] done -> dist/');
}

main().catch(err => {
  console.error('[build] error:', err && err.message ? err.message : err);
  process.exit(1);
});