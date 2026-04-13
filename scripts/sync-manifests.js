#!/usr/bin/env node
/**
 * sync-manifests.js
 *
 * Reads each sub-project's portfolio.manifest.json and writes a merged
 * portfolio/src/data/projects.json for the Astro landing page.
 *
 * Usage:
 *   node scripts/sync-manifests.js
 *   node scripts/sync-manifests.js --dry-run   # prints output without writing
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT  = join(ROOT, 'portfolio', 'src', 'data', 'projects.json');

const isDryRun = process.argv.includes('--dry-run');

// ── Sub-project directories (relative to repo root) ───────────────────────────
const SUB_PROJECTS = [
  'faithworkz',
  'qickr-ndis',
  'jjs_clone_gnome',
  'qickr-layalty-program',
  'qickr-pos-training-simulator',
  'geocon-soil-testing-reporting',
  'pwr-trackntrace',
  'qickr-scan',
];

// ── Schema helpers ────────────────────────────────────────────────────────────
const REQUIRED_FIELDS = [
  'id', 'title', 'shortDescription', 'technologies',
  'category', 'status', 'subdomain', 'featured', 'order',
  'emoji', 'accentColor', 'highlights',
];

function validate(manifest, dir) {
  const missing = REQUIRED_FIELDS.filter((f) => !(f in manifest));
  if (missing.length > 0) {
    console.warn(`  ⚠  [${dir}] Missing fields: ${missing.join(', ')}`);
  }
}

function buildSubdomainUrl(manifest) {
  if (manifest.status !== 'live') return null;
  if (manifest.subdomainUrl) return manifest.subdomainUrl;
  return `https://${manifest.subdomain}.qickrapps.au`;
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log('🔄  Syncing portfolio manifests…\n');

const projects = [];

for (const dir of SUB_PROJECTS) {
  const manifestPath = join(ROOT, dir, 'portfolio.manifest.json');

  if (!existsSync(manifestPath)) {
    console.warn(`  ⚠  Skipping ${dir} — portfolio.manifest.json not found`);
    continue;
  }

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  } catch (err) {
    console.error(`  ✖  [${dir}] Failed to parse manifest: ${err.message}`);
    continue;
  }

  validate(manifest, dir);

  // Strip the internal $schema key; keep everything else
  const { $schema, ...rest } = manifest;

  projects.push({
    ...rest,
    subdomainUrl: buildSubdomainUrl(manifest),
    // Ensure liveAppUrl always exists (defaults to null)
    liveAppUrl: manifest.liveAppUrl ?? null,
    // Stamp sync time
    _syncedAt: new Date().toISOString(),
  });

  console.log(`  ✔  ${manifest.title} (${manifest.status})`);
}

// Sort by order field ascending
projects.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));

const json = JSON.stringify(projects, null, 2) + '\n';

if (isDryRun) {
  console.log('\n── Dry run output ────────────────────────────────────────');
  console.log(json);
} else {
  writeFileSync(OUT, json, 'utf-8');
  console.log(`\n✅  Wrote ${projects.length} project(s) → portfolio/src/data/projects.json`);
}

