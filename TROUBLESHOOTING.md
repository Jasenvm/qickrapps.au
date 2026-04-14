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
The GitHub Actions bot commits an updated `projects.json` after the sync step.
If you push locally at the same time (or shortly after), your local branch is behind.

**Fix:**
```bash
git fetch origin
git merge origin/main --no-edit   # preferred over rebase (see below)
git push
```

> **Why `merge` instead of `rebase`?**
> `git pull --rebase` will fail with _"cannot pull with rebase: You have unstaged changes"_
> if you have any untracked or modified files in the working tree (e.g. new assets from a
> sub-project build). `git merge` is safer here because it does not require a clean tree.

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

## ❌ `git pull --rebase` fails — "cannot pull with rebase: You have unstaged changes"

**Symptom:**
```
error: cannot pull with rebase: You have unstaged changes.
error: Please commit or stash them.
```

**Root Cause:**
Untracked or modified files in the working tree (e.g. compiled sub-project assets, new
`vercel.json` files, or leftover stash-pop artifacts) block `--rebase`.

**Fix:**
Use merge instead, or temporarily stash then restore:
```bash
# Option A — merge (safest, no clean-tree requirement)
git fetch origin && git merge origin/main --no-edit

# Option B — stash, rebase, restore
git stash
git pull --rebase
git stash pop
```

If a stash pop creates merge conflicts in `portfolio/src/data/projects.json`, resolve by
regenerating it from source:
```bash
node scripts/sync-manifests.js
git add portfolio/src/data/projects.json
git merge --continue   # or git rebase --continue
```

---

## ❌ `projects.json` merge conflict with CI bot

**Symptom:**
```
CONFLICT (content): Merge conflict in portfolio/src/data/projects.json
Automatic merge failed; fix conflicts and then commit the result.
```

**Root Cause:**
The CI bot regenerates `projects.json` after every push. If you also run
`node scripts/sync-manifests.js` locally and commit the result, both versions diverge
(different `_syncedAt` timestamps, sometimes different field ordering).

**Fix — always authoritative:**
```bash
# Let your local manifests win — regenerate fresh, then complete the merge/rebase
node scripts/sync-manifests.js
git add portfolio/src/data/projects.json
git commit --no-edit   # for merge
# or
git rebase --continue  # for rebase
git push
```

**Prevention:** Don't commit `projects.json` locally unless you need to test the Astro
build. The CI bot is the canonical writer — let it handle it.

---

## ❌ Custom subdomain returns 404 after Vercel domain assignment

**Symptom:**
`curl https://my-subdomain.qickrapps.au` returns `404` even though the domain was added
in the Vercel dashboard.

**Root Cause — two possible causes:**
1. **DNS not yet propagated** — new DNS records take 1–60 minutes.
2. **Domain added to project but not aliased to a deployment** — Vercel requires the domain
   to be assigned to a specific production deployment, not just the project.

**Fix:**
```bash
# Confirm the domain is visible on the project
npx vercel domains ls --scope team_GriAJJCtGClrY7QoCnKX777r

# If DNS is propagated but still 404, force-alias to latest production deployment
npx vercel alias set <deployment-url>.vercel.app my-subdomain.qickrapps.au \
  --scope team_GriAJJCtGClrY7QoCnKX777r
```

**macOS DNS cache flush (if local curl returns stale result):**
```bash
sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder
```

---

## ❌ Domain audit: URL serves wrong content (app vs. marketing)

**Symptom:**
The portfolio card's "App" button opens a marketing page, or "Website" opens the actual app.

**Root Cause:**
`subdomainUrl` and `liveAppUrl` were set without verifying what each URL actually serves.
Common gotchas discovered during audit (April 2026):

| Project | Issue found |
|---|---|
| FaithWorkz | `faithworkz.qickrapps.au` and `faith-workz.vercel.app` served **identical** React SPA — no separate marketing page existed yet |
| YEMS NDIS | `yems.qickrapps.com` served a Refine.dev default scaffold; the real app is at `yems.qickrapps.com` |
| POS Simulator | Root `/` is the actual simulator; `/demo` is a developer component showcase — roles were reversed in the manifest |

**Fix:**
Run the domain audit script to verify what each URL actually serves before committing URLs:
```bash
node scripts/_check-domains.mjs   # temporary audit script — delete after use
```
Then cross-reference the HTML `<title>`, word count, SPA signals, and login/dashboard keywords.

**Convention going forward:**
- `subdomainUrl` → the branded `*.qickrapps.au` marketing / landing page (ghost button: "Website ↗")
- `liveAppUrl` → wherever the interactive application actually runs (primary button: "App ↗")

---

## 📝 Key IDs for reference

| Resource | Value |
|---|---|
| Vercel Org ID | `team_GriAJJCtGClrY7QoCnKX777r` |
| Vercel Project ID (portfolio hub) | `prj_LAG0ohTiy8Yp0x6jNS9TvdNNAa1y` |
| Vercel Project ID (FaithWorkz app) | `prj_5Rr3bB3kdtYZt7JKvtm9ApYAu9op` |
| Vercel Project ID (FaithWorkz marketing) | `prj_GqtyUh5QIQE53VCuJriIxH50vvAv` |
| Vercel Project ID (POS Simulator) | `prj_bBWmTKzk7fwUR8ZCBkiJIzTHeYfG` |
| GitHub repo | `github.com/Jasenvm/qickrapps.au` |
| Production URL | `https://qickrapps.au` |
| Vercel project dashboard | https://vercel.com/jasenvm/qickrapps-portfolio |

