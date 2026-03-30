# Troubleshooting & Learnings — qickrapps.au

Real issues hit during setup, with root causes and fixes.

---

## ❌ "No existing credentials found" in GitHub Actions

**Symptom:**
```
Error: No existing credentials found. Please run `vercel login` or pass "--token"
```
The deploy step fails even though `VERCEL_TOKEN` appears in the workflow env block.

**Root Cause:**
The secrets were saved as **Environment secrets** (e.g., inside a `production` environment)
rather than **Repository secrets**. GitHub only injects environment secrets when the workflow
explicitly declares `environment: production`. Our workflow does not — so the vars are empty.

**Fix:**
1. Go to https://github.com/Jasenvm/qickrapps.au/settings/secrets/actions
2. Confirm all three secrets appear under the **"Repository secrets"** heading (not nested under Environments)
3. If they're under an environment, delete them and re-add via **"New repository secret"** (green button at the top-right)

**Required secrets (Repository-level):**
| Name | Value |
|---|---|
| `VERCEL_TOKEN` | Token from vercel.com/account/tokens (Full Account scope) |
| `VERCEL_ORG_ID` | `team_GriAJJCtGClrY7QoCnKX777r` |
| `VERCEL_PROJECT_ID` | `prj_LAG0ohTiy8Yp0x6jNS9TvdNNAa1y` |

---

## ❌ Portfolio changes not visible after pushing

**Symptom:**
You push a manifest change or edit a file in `portfolio/src/`, hard-refresh the site, and nothing changes.

**Root Cause:**
The portfolio is a **static Astro site** — `projects.json` is baked into HTML at build time.
Pushing to GitHub only updates the source files in the repo. The live site only changes when
a new Vercel build is triggered and deployed.

**Fix (manual):**
```bash
cd portfolio
vercel --prod
```

**Fix (permanent):**
Ensure the GitHub Actions workflow is running successfully. Every push to `main` that touches
any `portfolio.manifest.json`, `scripts/sync-manifests.js`, or `portfolio/src/**` will
auto-sync + auto-deploy.

---

## ❌ `git push` rejected — "fetch first"

**Symptom:**
```
error: failed to push some refs to 'github.com:Jasenvm/qickrapps.au.git'
hint: Updates were rejected because the remote contains work that you do not have locally.
```

**Root Cause:**
The GitHub Actions bot commits an updated `projects.json` with `[skip ci]` after the sync step.
If you push locally at the same time (or shortly after), your local branch is behind.

**Fix:**
```bash
git pull --rebase
git push
```

The rebase applies your commit on top of the bot's commit cleanly, with no merge conflicts
(the bot only ever touches `portfolio/src/data/projects.json`).

---

## ❌ `projects.json` is out of date locally

**Symptom:**
You run `npm run dev` in `portfolio/` and the card count or content doesn't match what's
in the manifest files.

**Root Cause:**
`projects.json` is auto-generated and gitignored-equivalent during CI. Your local copy may
be stale if the bot has updated it remotely, or if you added a new manifest without running
the sync script.

**Fix:**
```bash
# From repo root
git pull
node scripts/sync-manifests.js
```

---

## ❌ New project not appearing in the portfolio

**Symptom:**
You created a folder and a `portfolio.manifest.json`, pushed to `main`, and the new card
doesn't appear.

**Checklist:**
1. ✅ Folder exists at the repo root (e.g., `my-new-project/`)
2. ✅ `portfolio.manifest.json` is inside that folder
3. ✅ The folder name is registered in `scripts/sync-manifests.js` → `SUB_PROJECTS` array
4. ✅ The manifest has all required fields (run `node scripts/sync-manifests.js --dry-run` to check for warnings)
5. ✅ The GitHub Actions workflow completed successfully (check https://github.com/Jasenvm/qickrapps.au/actions)

If step 3 is missing, the sync script silently skips the folder.

---

## ❌ Vercel deploy step takes 60–90 seconds — is it hung?

**Expected behaviour.** The `npx vercel pull / build / deploy` sequence installs the Vercel CLI
via npx on a cold runner, which itself takes ~15 seconds. The full sequence typically runs in
60–90 seconds on a GitHub-hosted runner. This is normal.

---

## ⚠️ `[skip ci]` commit still triggers a workflow run

**Symptom:**
The bot's `chore: sync projects.json from manifests [skip ci]` commit appears to trigger a
new workflow run.

**Root Cause:**
The `[skip ci]` convention is only honoured for `push` and `pull_request` triggers on GitHub.
The `workflow_dispatch` and `schedule` triggers ignore it.

**This is intentional and safe** — if you manually dispatch the workflow, it will always run
all steps regardless of the last commit message. The `[skip ci]` tag only prevents a *new push*
from looping back.

---

## 📝 Key IDs for reference

| Resource | Value |
|---|---|
| Vercel Org ID | `team_GriAJJCtGClrY7QoCnKX777r` |
| Vercel Project ID (portfolio) | `prj_LAG0ohTiy8Yp0x6jNS9TvdNNAa1y` |
| GitHub repo | `github.com/Jasenvm/qickrapps.au` |
| Production URL | `https://qickrapps.au` |
| Vercel project dashboard | https://vercel.com/jasenvm/qickrapps-portfolio |

