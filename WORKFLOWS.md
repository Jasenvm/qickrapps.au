# Developer Workflows — qickrapps.au

Common step-by-step tasks for maintaining and extending this monorepo.

---

## 1. Add a New Coming-Soon Project

**Time: ~2 min. No build required.**

```bash
# 1. Create the folder
mkdir my-new-project

# 2. Create the manifest (copy template from MANIFEST_REFERENCE.md)
touch my-new-project/portfolio.manifest.json

# 3. Register it in the sync script
#    → Open scripts/sync-manifests.js
#    → Add 'my-new-project' to the SUB_PROJECTS array

# 4. Dry-run to verify it parses correctly
node scripts/sync-manifests.js --dry-run

# 5. Commit and push — CI/CD handles the rest
git add my-new-project/ scripts/sync-manifests.js
git commit -m "feat: add my-new-project placeholder"
git push
```

The GitHub Actions workflow triggers on push, syncs `projects.json`, and redeploys the portfolio automatically. The new card will appear on `qickrapps.au` within ~2 minutes.

---

## 2. Promote a Project from Coming-Soon → Live

```bash
# 1. Edit the project's manifest
#    → Set "status": "live"
#    → Set "subdomain": "your-subdomain"  (must match your Vercel deployment)
#    → Set "featured": true  (optional — puts it at the top)
#    → Update "lastUpdated" to today's date

# 2. Commit and push
git add your-project/portfolio.manifest.json
git commit -m "feat: go live — your-project"
git push
```

> **Note:** The subdomain `your-subdomain.qickrapps.au` must already be configured in Vercel
> (the sub-project's own Vercel project → Settings → Domains) before users can reach it.

---

## 3. Update a Manifest Field

Any change to any `portfolio.manifest.json` triggers an auto-redeploy of the portfolio hub.

```bash
# Edit the field
# Example: update shortDescription, add a highlight, change accentColor

git add your-project/portfolio.manifest.json
git commit -m "chore: update your-project manifest"
git push
```

---

## 4. Edit the Portfolio UI (Astro)

The portfolio source lives in `portfolio/src/`.

| File | Purpose |
|---|---|
| `portfolio/src/pages/index.astro` | Main page layout, hero, stats, project grid |
| `portfolio/src/components/ProjectCard.astro` | Individual project card component |
| `portfolio/src/layouts/Layout.astro` | HTML shell, global CSS variables |
| `portfolio/src/data/projects.json` | **Auto-generated — never edit by hand** |

```bash
# Local dev server (hot-reload)
cd portfolio
npm run dev
# Open http://localhost:4321

# After editing, just push — CI/CD rebuilds and deploys
git add portfolio/src/
git commit -m "style: update hero section"
git push
```

---

## 5. Run the Sync Script Locally

```bash
# From repo root:

# Dry run — prints merged projects.json without writing
node scripts/sync-manifests.js --dry-run

# Live run — writes portfolio/src/data/projects.json
node scripts/sync-manifests.js
```

Use dry-run to validate a new manifest before committing.

---

## 6. Trigger a Manual Deploy (without a code change)

**Via GitHub Actions UI:**
1. Go to https://github.com/Jasenvm/qickrapps.au/actions
2. Click **"Sync Manifests & Deploy Portfolio"**
3. Click **"Run workflow"** → **"Run workflow"** (on `main`)

**Via CLI (from repo root):**
```bash
gh workflow run sync-manifests.yml --ref main
```

---

## 7. Trigger a Deploy from a Sub-Project Repo

If a sub-project lives in a separate GitHub repo, it can ping this portfolio to redeploy:

```bash
# From the sub-project's CI (replace TOKEN with a GitHub PAT)
curl -X POST \
  -H "Authorization: token $TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/Jasenvm/qickrapps.au/dispatches \
  -d '{"event_type":"manifest-updated","client_payload":{"project":"your-project-id"}}'
```

This hits the `repository_dispatch` trigger in the workflow.

---

## 8. Verify the Full Pipeline After a Push

```bash
# Watch the latest run
gh run watch

# Or check status directly
gh run list --limit 3
```

Expected green steps:
1. Checkout repository
2. Set up Node.js
3. Log trigger source
4. Run sync script
5. Check for changes to projects.json
6. Commit updated projects.json (if changed)
7. Install portfolio dependencies
8. Deploy to Vercel (production) ✅

---

## 9. Deploy a FaithWorkz Marketing Site Update

The FaithWorkz marketing site lives in `faithworkz/marketing/` in the **FaithWorkz repo**
(not this monorepo). It deploys to a separate Vercel project and must be pushed manually.

```bash
# From inside the FaithWorkz repo
cd marketing
npx vercel deploy --prod

# Re-apply the custom alias after every production deploy
npx vercel alias set <returned-deployment-url> faithworkz-marketing.qickrapps.au \
  --scope team_GriAJJCtGClrY7QoCnKX777r

# Verify
curl -s -o /dev/null -w "%{http_code}" https://faithworkz-marketing.qickrapps.au
# Expected: 200
```

> **Why `npx serve` locally but not on Vercel?**
> Opening `index.html` via `file://` in a browser blocks fetch() and CORS. `npx serve`
> spins up a local HTTP server so the browser treats it as `http://localhost`. On Vercel,
> files are served over HTTPS directly — no local server needed.

---

## 10. Audit Live URLs (App vs. Marketing Check)

Run whenever manifests are updated or a new project goes live, to verify each URL
serves the expected content type.

```bash
# Create a temporary audit script (delete after use)
# See scripts/_check-domains.mjs for the full template

node scripts/_check-domains.mjs
```

**URL role convention:**

| Manifest field | Card button | Should serve |
|---|---|---|
| `subdomainUrl` | Website ↗ (ghost) | Marketing / landing page |
| `liveAppUrl` | App ↗ (primary) | The interactive application |

**Quick manual check per URL:**
```bash
curl -sL https://my-url.com | head -30
# Look for: <title>, login/dashboard keywords, or marketing hero/CTA text
```

**Live URL map (April 2026):**

| Project | Website (subdomainUrl) | App (liveAppUrl) |
|---|---|---|
| 🏠 FaithWorkz | faithworkz-marketing.qickrapps.au | faithworkz.qickrapps.au |
| ♿ YEMS NDIS | qickr-ndis.qickrapps.au | yems.qickrapps.com |
| 🖥️ POS Simulator | qickr-pos-training-simulator.qickrapps.au | qickr-pos-training-simulator.qickrapps.au |

---

## 11. Resolve `projects.json` Merge Conflict (CI bot race)

The CI bot commits `projects.json` after every push. If you've also committed it locally,
a conflict will occur on the next pull.

```bash
# Cleanest resolution — regenerate from source and complete the merge
git fetch origin
git merge origin/main --no-edit   # conflict will appear on projects.json

node scripts/sync-manifests.js    # regenerates authoritative version
git add portfolio/src/data/projects.json
git commit --no-edit
git push
```

