# Manifest Reference — `portfolio.manifest.json`

Every sub-project folder must contain a `portfolio.manifest.json` at its root.
This file is the single source of truth for all portfolio card data.

The sync script (`scripts/sync-manifests.js`) reads these files and writes
`portfolio/src/data/projects.json` — **never edit `projects.json` by hand**.

---

## Field Reference

| Field | Type | Required | Notes |
|---|---|---|---|
| `$schema` | string | No | Always `"../scripts/manifest.schema.json"` |
| `id` | string | ✅ | Unique slug, kebab-case. Used as React key. |
| `title` | string | ✅ | Display name shown on the portfolio card. |
| `shortDescription` | string | ✅ | One-line summary. Shown on the card. ~100 chars max. |
| `description` | string | No | Longer description. Reserved for future detail page. |
| `technologies` | string[] | ✅ | Tech stack badges. Empty array `[]` is valid. |
| `category` | string | ✅ | See valid values below. |
| `status` | string | ✅ | `"live"` \| `"coming-soon"` \| `"archived"` |
| `subdomain` | string | ✅ | e.g. `"faithworkz"` → `faithworkz.qickrapps.au` |
| `featured` | boolean | ✅ | `true` floats the card to the top of the grid. |
| `order` | number | ✅ | Sort position within featured/non-featured groups. |
| `emoji` | string | ✅ | Single emoji. Displayed as the card icon. |
| `accentColor` | string | ✅ | CSS hex colour for the card accent bar and hover border. |
| `highlights` | string[] | ✅ | Up to 3 bullet points shown on the card. Empty `[]` is valid. |
| `screenshots` | string[] | No | URLs. Reserved for future use. Use `[]`. |
| `repositoryUrl` | string \| null | No | GitHub link. `null` for private repos. |
| `subdomainUrl` | string \| null | No | Explicit URL for the marketing/landing page. Auto-built from `subdomain` if omitted. Renders as ghost "Website ↗" button. |
| `liveAppUrl` | string \| null | No | URL for the interactive application. Renders as primary "App ↗" button. Set to `null` if no separate app URL exists. |
| `version` | string | No | SemVer. Informational only. |
| `lastUpdated` | string | No | ISO date `YYYY-MM-DD`. |

---

## `category` Valid Values

| Value | Use for |
|---|---|
| `"productivity"` | Tools for personal or team productivity |
| `"saas"` | Software-as-a-service platforms |
| `"utility"` | Standalone tools and utilities |
| `"education"` | Learning and training platforms |
| `"ecommerce"` | Shopping and commerce apps |
| `"health"` | Health and medical tools |

---

## URL Fields — Convention & Card Button Mapping

Two URL fields control the buttons rendered on each project card:

| Field | Card button | Style | When to set |
|---|---|---|---|
| `liveAppUrl` | **App ↗** | Primary (filled) | URL of the interactive application — may be a different domain or sub-path from the subdomain |
| `subdomainUrl` | **Website ↗** | Ghost (outline) | URL of the marketing / landing page — set explicitly or auto-built |

### How `subdomainUrl` is resolved by the sync script

1. If `status !== "live"` → `null` (no button shown)
2. If `subdomainUrl` is set explicitly in the manifest → use that value
3. Otherwise → auto-build as `https://{subdomain}.qickrapps.au`

### Dual-button pattern (recommended for live projects)

Set **both** fields to give the card two distinct, meaningful links:

```json
"subdomainUrl": "https://my-project.qickrapps.au",
"liveAppUrl":   "https://app.my-project.com"
```

### Single-button pattern

Omit `liveAppUrl` (or set to `null`) when there is no separate application URL — the card
shows only the "Website ↗" ghost button pointing to `subdomainUrl`.

### Real project examples (April 2026)

| Project | subdomainUrl (Website ↗) | liveAppUrl (App ↗) |
|---|---|---|
| FaithWorkz | `faith-workz-marketing.vercel.app` | `faithworkz.qickrapps.au` |
| YEMS NDIS | `qickr-ndis.qickrapps.au` | `app.quickrndis.com.au` |
| POS Simulator | `qickr-pos-training-simulator.qickrapps.au` | *(same — no separate app URL yet)* |

> ⚠️ **Always verify URLs before committing.** Run a quick `curl -sL <url> | head -20` to
> confirm the page content matches the intended role (app vs. marketing). See
> `TROUBLESHOOTING.md` for the domain audit workflow.

---

## Example — Live Project

```json
{
  "$schema": "../scripts/manifest.schema.json",
  "id": "faithworkz",
  "title": "FaithWorkz",
  "shortDescription": "Household management PWA for families and housemates",
  "description": "Full description here.",
  "technologies": ["React", "Vite", "TypeScript", "Supabase", "PWA"],
  "category": "productivity",
  "status": "live",
  "subdomain": "faithworkz",
  "featured": true,
  "order": 1,
  "emoji": "🏠",
  "accentColor": "#6366f1",
  "highlights": [
    "Real-time multi-user sync via Supabase",
    "Web Push notifications via Service Worker",
    "Offline-capable PWA"
  ],
  "screenshots": [],
  "repositoryUrl": null,
  "subdomainUrl": "https://faithworkz.qickrapps.au",
  "liveAppUrl": "https://faithworkz.qickrapps.au",
  "version": "1.0.0",
  "lastUpdated": "2026-04-13"
}
```

## Example — Coming-Soon Placeholder

```json
{
  "$schema": "../scripts/manifest.schema.json",
  "id": "my-new-project",
  "title": "My New Project",
  "shortDescription": "One-line description shown on the portfolio card.",
  "description": "Details coming soon.",
  "technologies": [],
  "category": "utility",
  "status": "coming-soon",
  "subdomain": "my-new-project",
  "featured": false,
  "order": 9,
  "emoji": "🚀",
  "accentColor": "#6366f1",
  "highlights": [],
  "screenshots": [],
  "repositoryUrl": null,
  "version": "0.0.0",
  "lastUpdated": "2026-03-30"
}
```

---

## Validation

The sync script checks for missing required fields and prints warnings:

```
⚠  [my-project] Missing fields: emoji, accentColor
```

Run a dry-run before committing to catch issues early:

```bash
node scripts/sync-manifests.js --dry-run
```

