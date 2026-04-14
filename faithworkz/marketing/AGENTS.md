# FaithWorkz — Project Facts Sheet

> Technical reference for AI sessions and developers. Read this file to instantly understand the project setup, deployment requirements, and architecture rules.

---

## 1 · Project Identity

| Field | Value |
|---|---|
| **App name** | Household Assistant (branded as **FaithWorkz**) |
| **Repository** | https://github.com/Jasenvm/FaithWorkz |
| **Branch** | `household-assistant-app` (default + production branch) |
| **Purpose** | AI-powered household management PWA — tasks, bills, shopping, fridge, meals, vehicles, projects, health, messaging and more |

---

## 2 · Live URLs

| Resource | URL |
|---|---|
| **Main App** | https://faith-workz.vercel.app |
| **Marketing Site** | https://faithworkz-marketing.qickrapps.au |
| **AI Facts Sheet** | https://faithworkz-marketing.qickrapps.au/AGENTS.md |

---

## 3 · Vercel Deployment

| Field | Value |
|---|---|
| **Main app project** | faith-workz (`prj_5Rr3bB3kdtYZt7JKvtm9ApYAu9op`) |
| **Marketing project** | marketing (`prj_GqtyUh5QIQE53VCuJriIxH50vvAv`) |
| **Team / Org ID** | `team_GriAJJCtGClrY7QoCnKX777r` |
| **Main app deploy** | Auto-deploys on push to `household-assistant-app` via root `vercel.json` (SPA rewrites: `/*` → `/index.html`) |
| **Marketing deploy** | Manual CLI — `cd marketing && npx vercel deploy --prod`, then re-apply alias (see §8) |
| **Marketing source dir** | `marketing/` — contains `index.html`, `styles.css`, `vercel.json`, `.vercel/project.json` |
| **Root vercel.json** | SPA rewrite config for main app only — **do NOT use for marketing** |

---

## 4 · Supabase Backend

| Field | Value |
|---|---|
| **Project name** | household-assistant |
| **Project ID** | `pbgjehjzuwmkqkvzfjqs` |
| **Region** | ap-southeast-2 (Sydney) |
| **Auth model** | No Supabase Auth — QR-code-based room system. Room ID stored in `localStorage`. No user accounts. |
| **Realtime** | `postgres_changes` subscriptions on all key tables, filtered by `room_id` |
| **Edge Functions** | `send-reminder-push` (Web Push notifications) |
| **Storage bucket** | `household-media` (public, for project photos) |

### Key Tables

`rooms` · `todo_lists` · `todo_items` · `tasks` · `bills` · `payments` · `messages` · `reminders` · `medications` · `emergency_contacts` · `fridge_items` · `shopping_items` · `recipes` · `meal_plan_entries` · `projects` · `vehicles` · `books` · `journal_entries` · `house_rules` · `member_points`

---

## 5 · Tech Stack

| Category | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| UI library | Ant Design 5 |
| Framework | Refine (refinedev) |
| Drag & drop | @dnd-kit |
| Rich text | TipTap |
| PDF export | @react-pdf/renderer |
| QR scanning | html5-qrcode |
| AI | Anthropic Claude 3.5 Haiku via Supabase Edge Functions |
| Realtime | Supabase Realtime (WebSockets) |
| State | React context + module-level caches for layout-resilient state |

---

## 6 · Architecture Rules (for AI Sessions)

- **Layout state persistence:** `ThemedLayoutV2` remounts on mobile↔desktop breakpoint change — use module-level cache variables (`_cachedView`, `_cachedSelectedListId`) for any page with meaningful local state. Pattern already in `todos.tsx`.
- **Mentions system:** All new entity types must be registered in `src/utils/mentions.tsx` (`MentionType` + `MENTION_TYPE_META`) and `src/hooks/useMentionData.tsx` (`fetchAll` + `buildOptions` + `TYPE_ORDER`).
- **Code splitting:** All new pages use `React.lazy()` in `App.tsx` — no static imports for pages.
- **RLS:** Every new Supabase table needs RLS with SELECT/INSERT/UPDATE/DELETE policies scoped to `room_id`.
- **Mobile-first:** All pages use `Grid.useBreakpoint()` and are tested at 375 px.
- **Realtime mandatory:** Every page that reads from a table must subscribe to `postgres_changes` for that table.
- **Dev mode autofill:** Every form needs a 🪄 Auto Fill button when `devMode === true` (`src/contexts/DevModeContext.tsx`).

---

## 7 · Key File Locations

| Purpose | Path |
|---|---|
| Main app entry | `src/main.tsx` |
| Route config | `src/App.tsx` |
| Room context (auth) | `src/contexts/RoomContext.tsx` |
| Mention hook | `src/hooks/useMentionData.tsx` |
| Mention types | `src/utils/mentions.tsx` |
| Dev mode context | `src/contexts/DevModeContext.tsx` |
| Autofill data | `src/utils/autoFill.ts` |
| Supabase client | `src/supabaseClient.ts` |
| Architecture rules | `README.md` |
| Migrations | `supabase/migrations/` |

---

## 8 · Deployment Checklist (for AI Sessions Making Changes)

1. Make changes to `src/` files.
2. Run: `npm run build` — must exit 0, zero TypeScript errors.
3. `git add -A && git commit -m "description" && git push origin household-assistant-app`
4. Main app auto-deploys via Vercel GitHub integration.
5. If any file in `marketing/` was changed:
   ```bash
   cd marketing && npx vercel deploy --prod && npx vercel alias set <deployment-url> faithworkz-marketing.qickrapps.au
   ```
6. Verify: `curl -s -o /dev/null -w "%{http_code}" https://faith-workz.vercel.app` (expect **200**)

---

*Last updated: April 2026 · [faithworkz-marketing.qickrapps.au](https://faithworkz-marketing.qickrapps.au) · [github.com/Jasenvm/FaithWorkz](https://github.com/Jasenvm/FaithWorkz)*

