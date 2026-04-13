#!/usr/bin/env node
/**
 * verify-health.js
 *
 * Automated health check for all portfolio projects.
 * Reads portfolio/src/data/projects.json and for each live project checks:
 *   - HTTP connectivity  (200 OK within 10 s)
 *   - Version freshness  (via /version.json, then <meta name="version">)
 *
 * Usage:  node scripts/verify-health.js
 * Exit 0: all live projects healthy (or coming-soon)
 * Exit 1: one or more live projects offline / erroring
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname    = dirname(fileURLToPath(import.meta.url));
const ROOT         = resolve(__dirname, '..');
const PROJECTS_JSON = join(ROOT, 'portfolio', 'src', 'data', 'projects.json');
const REPORTS_DIR  = join(ROOT, 'REPORTS');
const REPORT_FILE  = join(REPORTS_DIR, 'HEALTH_CHECK.md');
const TIMEOUT_MS   = 10_000;

// ── Status categories ─────────────────────────────────────────────────────────
const STATUS = {
  HEALTHY:     { icon: '🟢', label: 'Healthy' },
  STALE:       { icon: '🟡', label: 'Stale' },
  OFFLINE:     { icon: '🔴', label: 'Offline / Error' },
  PLACEHOLDER: { icon: '⚪', label: 'Placeholder' },
};

// ── HTTP GET with abort-based timeout ─────────────────────────────────────────
async function checkUrl(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'qickrapps-health-check/1.0' },
    });
    clearTimeout(timer);
    return { ok: res.status === 200, httpStatus: res.status, body: await res.text() };
  } catch (err) {
    clearTimeout(timer);
    return {
      ok: false, httpStatus: null, body: null,
      error: err.name === 'AbortError' ? 'Timeout (10s)' : err.message,
    };
  }
}

// ── Version detection: Option B (/version.json) then Option A (<meta> tags) ──
async function detectVersion(origin, html) {
  // Option B — /version.json at deployment root
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5_000);
    const res = await fetch(`${origin}/version.json`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'qickrapps-health-check/1.0' },
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      if (data.version || data.lastUpdated) {
        return { version: data.version ?? null, lastUpdated: data.lastUpdated ?? null, source: 'version.json' };
      }
    }
  } catch { /* fall through to Option A */ }

  // Option A — <meta name="version"> and <meta name="build-date"> in page HTML
  if (html) {
    const ver  = html.match(/<meta\s[^>]*name=["']version["'][^>]*content=["']([^"']+)["']/i)
               ?? html.match(/<meta\s[^>]*content=["']([^"']+)["'][^>]*name=["']version["']/i);
    const date = html.match(/<meta\s[^>]*name=["']build-date["'][^>]*content=["']([^"']+)["']/i)
               ?? html.match(/<meta\s[^>]*content=["']([^"']+)["'][^>]*name=["']build-date["']/i);
    if (ver || date) {
      return { version: ver?.[1] ?? null, lastUpdated: date?.[1] ?? null, source: 'meta tag' };
    }
  }

  return null; // not detectable
}

// ── Assess a single project ───────────────────────────────────────────────────
async function checkProject(project) {
  const base = {
    id: project.id, title: project.title, status: project.status,
    manifestVersion: project.version, manifestDate: project.lastUpdated,
    liveUrl: null, httpStatus: null,
    liveVersion: null, liveDate: null, versionSource: null,
    note: null, category: null,
  };

  // coming-soon projects are correctly placeholders — no checks needed
  if (project.status !== 'live') {
    return { ...base, category: STATUS.PLACEHOLDER };
  }

  const url = project.liveAppUrl ?? project.subdomainUrl;
  if (!url) return { ...base, category: STATUS.OFFLINE, note: 'No URL configured in manifest' };
  base.liveUrl = url;

  // Connectivity
  const { ok, httpStatus, body, error } = await checkUrl(url);
  base.httpStatus = httpStatus;
  if (!ok) return { ...base, category: STATUS.OFFLINE, note: error ?? `HTTP ${httpStatus}` };

  // Version freshness
  const detected = await detectVersion(new URL(url).origin, body);
  if (detected) {
    base.liveVersion   = detected.version;
    base.liveDate      = detected.lastUpdated;
    base.versionSource = detected.source;
    const versionBehind = detected.version    && detected.version    !== project.version;
    const dateBehind    = detected.lastUpdated && detected.lastUpdated <  project.lastUpdated;
    if (versionBehind || dateBehind) {
      return { ...base, category: STATUS.STALE, note: 'Live version behind manifest' };
    }
  } else {
    base.note = 'Version not detectable — add /version.json or <meta name="version"> to enable';
  }

  return { ...base, category: STATUS.HEALTHY };
}

// ── Markdown report builder ───────────────────────────────────────────────────
function buildMarkdown(results, duration) {
  const now      = new Date().toUTCString();
  const statuses = Object.values(STATUS);
  const summary  = statuses.map(s => ({ ...s, count: results.filter(r => r.category === s).length }));

  const lines = [
    `# 🏥 Portfolio Health Check`,
    ``,
    `> Generated: **${now}** · Duration: **${duration}ms** · Projects: **${results.length}**`,
    ``,
    `| | Status | Count |`,
    `|---|---|---|`,
    ...summary.map(s => `| ${s.icon} | ${s.label} | ${s.count} |`),
    ``,
  ];

  for (const s of statuses) {
    const group = results.filter(r => r.category === s);
    if (group.length === 0) continue;
    lines.push(`## ${s.icon} ${s.label}`, ``);
    for (const r of group) {
      lines.push(`### ${r.title}`, ``);
      if (r.liveUrl)         lines.push(`- **URL:** ${r.liveUrl}`);
      if (r.httpStatus)      lines.push(`- **HTTP status:** ${r.httpStatus}`);
      if (r.manifestVersion) lines.push(`- **Manifest:** v\`${r.manifestVersion}\` (${r.manifestDate})`);
      if (r.liveVersion)     lines.push(`- **Live version:** v\`${r.liveVersion}\` · source: \`${r.versionSource}\``);
      else if (r.liveDate)   lines.push(`- **Live build date:** ${r.liveDate} · source: \`${r.versionSource}\``);
      if (r.note)            lines.push(`- **Note:** ${r.note}`);
      lines.push(``);
    }
  }

  return lines.join('\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🏥  Running portfolio health check…\n');
  const start    = Date.now();
  const projects = JSON.parse(readFileSync(PROJECTS_JSON, 'utf-8'));

  console.log(`   Checking ${projects.length} projects concurrently…\n`);
  const results  = await Promise.all(projects.map(checkProject));
  const duration = Date.now() - start;

  // Console output
  for (const r of results) {
    const extra = [r.httpStatus && `HTTP ${r.httpStatus}`, r.note].filter(Boolean).join(' — ');
    console.log(`  ${r.category.icon}  ${r.title}${extra ? `  (${extra})` : ''}`);
  }

  const counts = Object.values(STATUS).map(s => ({ ...s, n: results.filter(r => r.category === s).length }));
  console.log(`\n${'─'.repeat(58)}`);
  for (const { icon, label, n } of counts) console.log(`  ${icon}  ${label.padEnd(18)} ${n}`);
  console.log(`  ⏱   ${'Duration'.padEnd(18)} ${duration}ms`);

  // Write markdown report
  mkdirSync(REPORTS_DIR, { recursive: true });
  writeFileSync(REPORT_FILE, buildMarkdown(results, duration), 'utf-8');
  console.log(`\n✅  Report written → REPORTS/HEALTH_CHECK.md`);

  // Exit 1 if any live project is offline so CI clearly signals degraded state
  const offline = results.filter(r => r.category === STATUS.OFFLINE).length;
  if (offline > 0) {
    console.error(`\n❌  ${offline} project(s) offline — exiting with code 1`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('❌  Health check crashed:', err.message);
  process.exit(1);
});
