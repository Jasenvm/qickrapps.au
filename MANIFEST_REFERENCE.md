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
| `liveAppUrl` | string \| null | No | Override URL when the live app is not at the subdomain. |
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

## How `subdomainUrl` is Resolved

The sync script auto-computes `subdomainUrl` from the manifest:

- If `status !== "live"` → `subdomainUrl = null` (no link on the card)
- If `liveAppUrl` is set → uses `liveAppUrl` as the primary link
- Otherwise → `https://{subdomain}.qickrapps.au`

You can override this entirely by setting `subdomainUrl` directly in the manifest (advanced).

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
  "version": "1.0.0",
  "lastUpdated": "2026-03-30"
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

