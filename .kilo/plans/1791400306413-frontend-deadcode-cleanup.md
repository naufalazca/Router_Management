# Frontend Dead-Code Cleanup Plan

Goal: remove unused files, components, exports, imports, routes, and npm dependencies from `frontend/` with **zero behavior change** for the live router-management app. Scope decision (confirmed with user): **full purge, prod-only** — keep only what the app actually uses; delete demo/template leftovers and unused shadcn `ui/*` dirs (re-addable via shadcn CLI).

**Doc-first requirement (user):** before deleting anything, write regeneration docs so removed components and any Nuxt artifact can be re-created easily. This is **Phase 0** and must complete before Phase 1 deletions.

No backend/database changes. No migrations required (Rule 1 N/A).

---

## Phase 0 — Regeneration documentation (do FIRST, before any deletion)

Deliverable: a lightweight, copy-pasteable reference so future devs can regenerate deleted shadcn components and scaffold Nuxt artifacts without reverse-engineering.

### 0.1 Create `frontend/notes/GENERATE-COMPONENTS.md`

Follow existing `frontend/notes/*.md` convention (Indonesian prose, `# Title`, `## Struktur`, code fences). Must cover:

1. **Prerequisites**: Node 22.x (per `package.json` `engines`), pnpm is package manager (`packageManager` in `package.json`), run from `frontend/`.
2. **Regenerate deleted shadcn-vue `ui/*` components**
   - Config lives in `frontend/components.json` (style `new-york`, aliases `@/components/ui`, `@/lib/utils`, iconLibrary `lucide`, css `app/assets/css/tailwind.css`).
   - Command per component: `npx shadcn-vue@latest add <name>` (e.g. `npx shadcn-vue@latest add accordion`).
   - Batch from manifest (0.2): `Get-Content frontend/notes/removed-ui-components.json | ConvertFrom-Json | ForEach-Object { $_.uiDirs } | ForEach-Object { npx shadcn-vue@latest add $_ }`
   - Re-init config if `components.json` lost: `npx shadcn-vue@latest init`.
   - Full list of components removed by this cleanup (from plan section 4) with a note they can be re-added on demand.
   - **Important**: re-adding must NOT re-introduce the unused `ui/*` dirs; add only when actually used.
3. **Scaffold Nuxt artifacts** (document the exact `nuxi` commands):
   - Page: `npx nuxi add page <path>` → also add nav entry in `app/constants/menus.ts`.
   - Component: `npx nuxi add component <Name>` (auto-imported; see rules below).
   - Composable: `npx nuxi add composable <name>`.
   - Layout: `npx nuxi add layout <name>`.
   - Plugin: `npx nuxi add plugin <name>`.
   - Middleware: `npx nuxi add middleware <name>`.
   - Pinia store: no nuxi generator — create `app/stores/<name>.ts` with `defineStore`.
   - Add an npm module: `npx nuxi module add <module>` (then it auto-registers in `nuxt.config.ts`).
4. **Auto-import rules** (critical to avoid stale assumptions):
   - Components under `app/components/**` auto-imported by path+bname; nested dir prefix (e.g. `routeros/backup/RouterosBackupHeader.vue` → `<RouterosBackupHeader>`); configured via `nuxt.config.ts` `components: [{ path: '~/components' }]`.
   - `app/composables/**` auto-imported by function name.
   - `app/lib/**` auto-imported (via `imports.dirs: ['./lib']` in `nuxt.config.ts`).
   - `app/stores/**` NOT auto-imported — must `import { useXStore } from '~/stores/x'`.
   - Icons: collections loaded by `@nuxt/icon`; usage is `<Icon name="i-lucide-*" />` / `i-radix-icons-*`. Icon packages `@iconify-json/*` stay installed even though no direct string refs.
   - shadcn `ui/*` are consumed via explicit imports `@/components/ui/<dir>` (index.ts barrel), not bare auto-import in most files.
5. **Live route + nav map**: table of live pages (from "Live-app inventory" above) and reminder that new pages must be added to `app/constants/menus.ts` `navMenu` to appear in the sidebar (`AppSidebar.vue` reads it).
6. **Module / dep policy**: list modules currently in `nuxt.config.ts` and the ones removed in Phase 1, so future regen knows what is available (`@nuxt/icon`, `@nuxt/fonts`, `@nuxtjs/color-mode`, `@pinia/nuxt`, `@vueuse/nuxt`, `shadcn-nuxt`, `@nuxt/eslint`, `@nuxt/ui`).
7. **Verification commands**: `npm run lint`, `npm run typecheck`, `npm run build`.

### 0.2 Create `frontend/notes/removed-ui-components.json`

Machine-readable manifest so the deleted `ui/*` dirs can be batch-restored. Keep machine JSON (not prose) so it is directly consumable:

```json
{
  "generatedBy": "frontend dead-code cleanup",
  "shadcnConfig": "frontend/components.json",
  "restoreCmd": "npx shadcn-vue@latest add",
  "uiDirs": ["accordion","aspect-ratio","auto-form","button-group","carousel","chart","chart-area","chart-bar","chart-donut","chart-line","combobox","context-menu","empty","hover-card","input-group","item","menubar","navigation-menu","number-field","pagination","pin-input","progress","resizable","skeleton","slider","spinner","stepper","tabs","tags-input","toggle","toggle-group"]
}
```

Cross-reference: the `uiDirs` array must exactly match plan section 4 after **post-purge re-verification**. If any dir turns out to be second-order-unused only after Phase 1 edits (e.g. `context-menu`), include it here; `auto-form` is not a shadcn CLI name in all registries — if `add auto-form` fails, document it as repo-local (skip in restore flow). `spinner`/`empty`/`button-group`/`input-group`/`item` are newer shadcn-vue entries — verify each resolves via the CLI during Phase 2 validation; if any does not, note it in the doc.

> `Toggle`/`Tabs`/`Tooltip` remain in section 4 removed only if fully unreferenced after purge — re-check; if `tabs`/`toggle` are still referenced after demo deletion, remove them from both the plan list and this manifest. (`tooltip` stays per evidence — remove from manifest if it does not end up deleted.)

### 0.3 Update `frontend/notes/` index (optional, cheap)

No index file exists. Optionally add a one-line pointer in each? Skip — out of scope; the two new files are self-describing.

## Live-app inventory (must keep)

Routed pages actually reachable:
- `/` → `pages/index.vue`
- `/login` → `pages/login.vue` (layout: false)
- `/router`, `/company`, `/ipinfo`, `/kanban`, `/topology`
- `/routeros/user`, `/routeros/backup`, `/routeros/troubleshoot_ping`, `/routeros/troubleshoot_traceroute`, `/routeros/routing_connection`, `/routeros/routing_advertisement`, `/routeros/routing_session`
- `(error)/401|403|404|500|503.vue`, `error.vue`
- Nav source of truth: `app/constants/menus.ts` (`navMenu`).

Core infra kept: `app.vue`, `app.config.ts`, `layouts/{default,blank}.vue`, `middleware/auth.global.ts`, `plugins/api-fetch.ts`, `composables/useApiFetch.ts`, `composables/useAppSettings.ts`, `lib/{jwt,utils}.ts`, `constants/{menus,themes}.ts`, `types/{api,appSettings.d,backup,kanban-api,nav}.d.ts`, all `stores/**` except verified-unused.

## Evidence summary

Deleted files have **zero inbound references** (auto-import name, explicit import, `<ComponentName>`, store/composable use) after excluding each file's own self-reference.

- `composables/useKanban.ts` — only referenced by itself; `types/kanban.ts` only by it.
- Auth demo components (`SignIn`, `SignUp`, `ForgotPassword`, `OTPForm`, `OTPForm1`, `OTPForm2`) — not used by the live `pages/login.vue` (which is hand-written). `components/PasswordInput.vue` used only by those.
- `components/AppSettings.vue` — no `<AppSettings>` usage anywhere (greps matched `useAppSettings`/`appSettings` config, not the component).
- `components/DarkToggle.vue`, `components/layout/Auth.vue`, `components/base/DateRangePicker.vue` — zero refs.
- `components/topology/TopologyDataView.vue` — zero inbound refs (only `TopologyView.vue` is used by `pages/topology.vue`).
- `types/api.ts` — zero imports; `ApiError`/`PaginationMeta`/`PaginatedResponse` unused (`ApiResponse` hits come from `types/kanban-api.ts`).
- `lib/jwt.ts` exports `getTokenExpiryTime` (unused) and `decodeJwt` (only internal use). Remove `getTokenExpiryTime`; keep `decodeJwt` if still used in-file, else remove export keyword.
- `components/dashboard/TotalVisitors.vue`, `components/navigation-menu/DemoItem.vue` — zero refs (DemoItem only by demo page `pages/components/navigation-menu.vue`).
- `components/mail/**` — only used by `pages/email.vue`.
- `components/tasks/**` — only used by `pages/tasks.vue`.
- `components/settings/**` + `pages/settings/**` — demo settings; reachable only via `SidebarNavFooter.vue` `/settings` link + `routeRules` `/settings` redirect. Treated as demo under prod-only.
- `pages/email.vue`, `pages/tasks.vue`, `pages/components/**` (56 files) — demo gallery; no nav entry.
- `public/social-card.png` — zero refs.
- `plugins/ssrWidth.ts` — `provideSSRWidth`; `ssr:false`, so no SSR width needed. Low-risk to remove; verify no visual regressions on first paint.

## Files to DELETE

### 1. Demo pages
- `frontend/app/pages/email.vue`
- `frontend/app/pages/tasks.vue`
- `frontend/app/pages/components/**` (entire dir)
- `frontend/app/pages/settings/**` (entire dir)

### 2. Demo components
- `frontend/app/components/mail/**` (Nav, List, Layout, Display, AccountSwitcher, data/mails.ts)
- `frontend/app/components/tasks/**` (components/*, data/data.ts, data/schema.ts, data/tasks.json)
- `frontend/app/components/settings/**` (AccountForm, AppearanceForm, DisplayForm, Layout, NotificationsForm, ProfileForm, SidebarNav)
- `frontend/app/components/auth/**` (SignIn, SignUp, ForgotPassword, OTPForm, OTPForm1, OTPForm2)
- `frontend/app/components/dashboard/TotalVisitors.vue`
- `frontend/app/components/navigation-menu/DemoItem.vue`
- `frontend/app/components/AppSettings.vue`
- `frontend/app/components/DarkToggle.vue`
- `frontend/app/components/PasswordInput.vue`
- `frontend/app/components/layout/Auth.vue`
- `frontend/app/components/base/DateRangePicker.vue`
- `frontend/app/components/topology/TopologyDataView.vue`

### 3. Unused composables/types
- `frontend/app/composables/useKanban.ts`
- `frontend/app/types/kanban.ts`
- `frontend/app/types/api.ts`

### 4. Unused shadcn `ui/*` dirs (per-dir inbound scan, post-purge)
Delete: `accordion`, `aspect-ratio`, `auto-form`, `button-group`, `carousel`, `chart`, `chart-area`, `chart-bar`, `chart-donut`, `chart-line`, `combobox`, `context-menu`, `empty`, `hover-card`, `input-group`, `item`, `menubar`, `navigation-menu`, `number-field`, `pagination`, `pin-input`, `progress`, `resizable`, `skeleton`, `slider`, `spinner`, `stepper`, `tabs`, `tags-input`, `toggle`, `toggle-group`.

Keep: `alert`, `alert-dialog`, `avatar`, `badge`, `breadcrumb`, `button`, `calendar`, `card`, `checkbox`, `collapsible`, `command`, `dialog`, `drawer`, `dropdown-menu`, `field`, `form`, `input`, `kbd`, `label`, `popover`, `radio-group`, `range-calendar`, `scroll-area`, `select`, `separator`, `sheet`, `sidebar`, `sonner`, `switch`, `table`, `textarea`, `tooltip`.

> Re-verify each dir right before deletion with the same grep; a dir can gain a dependency during the edit.

### 5. Assets
- `frontend/public/social-card.png`

## Code edits required (dangling references)

- `frontend/app/components/Search.vue`: remove the hardcoded `Email` `CommandItem` (`handleSelectLink('/email')`); remove dead `componentsNav` computed + `CommandGroup heading="Components"` block (navMenu has no `Components` title — `@ts-expect-error` masks it). Keep Home suggestion.
- `frontend/app/components/layout/SidebarNavFooter.vue`: remove the `/settings` `NuxtLink` (settings deleted). Decide whether to keep the `Theme` dialog (`ThemeCustomize` stays).
- `frontend/nuxt.config.ts`: remove `routeRules` entries `'/components'` and `'/settings'` (targets deleted).
- `frontend/nuxt.config.ts`: remove unused modules `@nuxt/content`, `@nuxt/hints`, `@nuxt/scripts`, `@nuxt/image` and their devDependencies in `frontend/package.json`.
- `frontend/app/plugins/ssrWidth.ts`: delete (see evidence) unless visual check fails.
- `frontend/app/app.vue`: `useTextDirection` / `dir` only feed `ConfigProvider`; keep (RTL support). No change.

## Dependencies

Remove (verified zero usage in `app/`):
- `@nuxt/content`, `@nuxt/hints`, `@nuxt/scripts`, `@nuxt/image` (also from `nuxt.config.ts` `modules`)
- `@number-flow/vue`
- `@vue-flow/minimap` (keep `@vue-flow/{core,background,controls}` — used by topology)
- `better-sqlite3` (only pulled by `@nuxt/content`)
- `nanoid`

**DO NOT remove `@iconify-json/lucide` / `@iconify-json/radix-icons`** despite zero direct string refs: icons are consumed as `i-lucide-*` / `i-radix-icons-*` through `@nuxt/icon`, and the collections are needed for offline/build icon resolution. (Optionally replace the single `i-radix-icons-circle` in `Search.vue` with an `i-lucide-*` icon to drop the radix collection later — out of scope.)

## Unused imports / local vars (`no-unused-vars` class)

Do NOT hand-guess. Enumerate mechanically, then remove only confirmed ones:
- `cd frontend; npm run lint` (antfu config flags unused imports, unused vars, redundant Vue imports).
- `cd frontend; npm run typecheck` (vue-tsc) for unused types.
- Known redundant: explicit `import { onMounted, ref, watch, computed } from 'vue'` in pages like `topology.vue`, `kanban.vue`, `signIn` etc. — Nuxt auto-imports these. Remove explicit Vue imports where lint flags them; keep behavior identical.
- Confirmed unused import: `type IPInfoData` in `frontend/app/pages/ipinfo.vue:11` (never used in script/template). Remove.
- Confirmed unused export: `getTokenExpiryTime` in `frontend/app/lib/jwt.ts` (defined, never imported). Remove. `decodeJwt` only used in-file — drop the `export` keyword if no external importer.
- Optional deeper scan: `npx knip` or `npx ts-prune` for exported-symbol dead code across `stores/`, `lib/`, `types/`.

## Execution order (Phase 0 first, then parallelizable — use sub-agents, disjoint file sets)

- **Phase 0 (blocking, single writer):** create `frontend/notes/GENERATE-COMPONENTS.md` + `frontend/notes/removed-ui-components.json`. No deletions until these exist and match the final delete list.
- **Phase 1 groups (run concurrently; disjoint file sets):**
  - **Agent A — pages:** delete section 1 + edit `Search.vue`, `SidebarNavFooter.vue`.
  - **Agent B — components:** delete section 2 (non-ui).
  - **Agent C — ui dirs:** delete section 4 (verify each dir first).
  - **Agent D — infra:** sections 3 + 5, `plugins/ssrWidth.ts`, `nuxt.config.ts` route/module edits, `package.json` dep removal.

After all agents finish (single editor phase):
1. `cd frontend; npm install` (refresh lockfile after dep removals).
2. Fix lint-reported unused imports/vars.

## Validation

0. Phase 0 done: `frontend/notes/GENERATE-COMPONENTS.md` + `frontend/notes/removed-ui-components.json` exist; `uiDirs` matches the actually-deleted dirs 1:1.
1. `cd frontend; npm run lint` → 0 errors.
2. `cd frontend; npm run typecheck` → 0 errors.
3. `cd frontend; npm run build` (or `build:prod`/`generate`) → succeeds, no missing-component warnings.
4. Smoke routes (dev server): `/login`, `/`, `/router`, `/company`, `/ipinfo`, `/kanban`, `/topology`, `/routeros/user`, `/routeros/backup`, `/routeros/troubleshoot_ping`, `/routeros/routing_connection`, `/routeros/routing_advertisement`, `/routeros/routing_session`. Confirm each renders, sidebar nav intact, Search dialog opens, theme dialog works, logout works.
5. Confirm `git grep -F "ui/<each-deleted-dir>" app` returns nothing.
6. Confirm no 404s for `/email`, `/tasks`, `/components`, `/settings` (now intentionally gone); pick `pages/(error)/404.vue` fallback renders.
7. **Restore drill**: run one line from the manifest to prove docs work, e.g. `cd frontend; npx shadcn-vue@latest add tooltip` then `git checkout -- app/components/ui/tooltip` (or delete the regenerated dir). Confirms `components.json` + manifest + CLI path is valid. If any `uiDirs` name fails to resolve via CLI, correct the manifest and the doc note.

## Risks / rollback

- Broad deletions → verify build after each group; git makes rollback trivial (`git checkout -- <path>`).
- `@nuxt/image`/`@nuxt/content` module removal changes generated config; if build fails, re-add just that module.
- `ssrWidth` removal could alter first-paint width on very narrow viewports; revert if visual diff appears.
- Icon collection removal is explicitly avoided (see Dependencies).

## Open questions

- Keep `/settings` reachable (footer link) instead of deleting? Current plan deletes it (prod-only scope). If the team wants user settings, keep `pages/settings/**` + `components/settings/**` and only delete the other demos. **Default per confirmed scope: delete.**
