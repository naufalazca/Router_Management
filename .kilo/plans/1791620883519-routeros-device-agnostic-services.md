# Plan: Make RouterOS services device-agnostic (Router + Switch)

## Goal

Today the four services in `backend/src/services/routeros/` resolve credentials only
from the **Router** table (`prisma.router.findUnique`). As a result a **Switch id** throws
`Router with ID ... not found`, even though a `Switch` row carries the same RouterOS
credentials (`ipAddress`, `username`, `password`, `apiPort`, `sshPort`, `status`).

We want switches to be able to use the same RouterOS features (user, troubleshoot, backup)
that routers use, and we want the file naming to reflect which services are Router-only vs.
usable by any RouterOS device.

- **Router-only** things (e.g. BGP routing) get `routeros.router.*` names.
- **Any RouterOS device** (router or switch) gets `routeros.global.*` names.

## Key finding (must read before implementing)

Renaming the files alone changes **nothing functionally**. The real blocker is that every
service hard-codes `prisma.router.findUnique`. So this task is two parts:
1. **Behavioral:** resolve credentials by trying the **Switch** table first, then the **Router**
   table (per user decision).
2. **Naming:** rename services/controllers/routes to `routeros.router.*` (router-only) and
   `routeros.global.*` (device-agnostic).

`Backup` is currently structurally router-only (`RouterBackup.routerId` and
`BackupRestore.routerId` are required FKs to `Router`). The user confirmed backup must also
work on switches, so a **schema migration is in scope** using the backward-compatible
approach: add a **nullable `switchId`** and make `routerId` nullable, keeping existing table
names.

## Decisions locked with the user

- **Device resolution:** try `Switch` first, fall back to `Router`. No explicit device-type
  parameter, no unified Device model.
- **Services to make device-agnostic:** `user`, `troubleshoot`, `backup` → `routeros.global.*`.
- **Router-only:** `routing` → `routeros.router.routing.service.ts`.
- **Backup schema:** add nullable `switchId` FK to `RouterBackup` and `BackupRestore`, make
  `routerId` nullable, keep table names. Single migration, no data move.
- **Public HTTP paths:** keep unchanged (`/routeros/users`, `/routeros/troubleshoot`,
  `/routeros/backup`, `/routeros/:routerId/bgp/...`) to avoid breaking the frontend. Only
  internal file/class names change.

## Naming map

| Current file | New file | Scope |
|---|---|---|
| `services/routeros/routeros.user.service.ts` | `routeros.global.user.service.ts` | Router + Switch |
| `services/routeros/routeros.troubleshoot.service.ts` | `routeros.global.troubleshoot.service.ts` | Router + Switch |
| `services/routeros/routeros.backup.service.ts` | `routeros.global.backup.service.ts` | Router + Switch |
| `services/routeros/routeros.routing.service.ts` | `routeros.router.routing.service.ts` | Router only |

Mirror the same rename across the corresponding `controllers/routeros/` and
`routes/routeros/` files, and update class names / exported singleton names to match
(e.g. `RouterOSUserService` stays or becomes `RouterOSGlobalUserService` — see step 7 for the
naming choice to keep churn low).

## Affected boundaries

- **Service layer:** `backend/src/services/routeros/*` — credential resolution, prisma access.
- **Controller layer:** `backend/src/controllers/routeros/*` — imports + singleton names.
- **Route layer:** `backend/src/routes/routeros/*` and `routes/index.ts` — imports only; mount
  paths unchanged.
- **Prisma schema + migration:** `backend/prisma/schema.prisma` — `RouterBackup`,
  `BackupRestore`, plus inverse relations on `Router` and `Switch`.
- **Frontend:** no endpoint changes, so `frontend/app/stores/routeros/*` should keep working.
  Only verify; do not rename frontend files.

## Data model changes (schema.prisma)

1. `RouterBackup`:
   - Change `routerId String @map("router_id")` → `routerId String? @map("router_id")`.
   - Add `switchId String? @map("switch_id")`.
   - Change relation `router Router @relation(...)` → optional `router Router? @relation(...)`.
   - Add relation `switch Switch? @relation("SwitchBackups", fields: [switchId], references: [id], onDelete: Cascade)`.
   - Update `@@index([routerId, createdAt])` → add `@@index([switchId, createdAt])`.
2. `BackupRestore`:
   - Same treatment: `routerId String?`, add `switchId String?`, optional `router`, new `switch`
     relation, add `@@index([switchId])`.
3. `Router`: add inverse `backups` already exists; add nothing new unless Prisma requires the
   inverse for `switch`. Add inverse relation field on `Switch`:
   - `backups RouterBackup[] @relation("SwitchBackups")`
   - `restoreHistory BackupRestore[] @relation("SwitchRestores")` (name the relation on both sides consistently).
4. Leave `BackupSchedule` router-only for now (out of scope; note as follow-up) — its
   `routerId` stays optional and untouched.

Generate the migration after schema edits (implementation agent runs the repo's Prisma
workflow, e.g. `npx prisma migrate dev --name add_switch_owner_to_backups`). Do **not** move or
delete existing rows.

## Shared credential-resolution helper (new)

Create `backend/src/lib/routeros/resolve-device.ts` (or add to an existing lib file) exporting
a function that, given an id, returns a normalized connection descriptor:

```
type ResolvedDevice = {
  deviceType: 'router' | 'switch';
  id: string;
  ipAddress: string;
  username: string;
  password: string;   // decrypted
  apiPort: number;    // default 8728
  sshPort: number;    // default 22
  status: string;
};
```

Resolution rules:
1. `prisma.switch.findUnique({ where: { id } })` first.
2. If not found, `prisma.router.findUnique({ where: { id } })`.
3. If neither → throw `Device not found: ${id}`.
4. Enforce `status === 'ACTIVE'` for both (keep the existing error wording style).
5. Decrypt password with the existing `decrypt()` and preserve the current
   "Failed to decrypt ... password" error handling.

All three device-agnostic services call this helper instead of duplicating
`prisma.router.findUnique` + decrypt logic. This removes the ~35 duplicated lines currently in
each `getRouterClient`.

## Ordered tasks

1. **Schema migration** — edit `backend/prisma/schema.prisma` per the data-model section,
   add inverse relations on `Switch`, run the migration, run `prisma generate`.
2. **Add resolver helper** — `backend/src/lib/routeros/resolve-device.ts` as described.
3. **Rename routing service to router-only** —
   `git mv` (or move) `routeros.routing.service.ts` → `routeros.router.routing.service.ts`,
   controller → `routeros.router.routing.controller.ts`, routes →
   `routeros.router.routing.routes.ts`. Update all imports and the export in
   `routes/index.ts`. No behavior change.
4. **Rename user/troubleshoot/backup to global** — move to `routeros.global.*` and update
   imports in their controllers, the controllers' imports in routes, and `routes/index.ts`.
5. **Refactor user service** to use the resolver helper; generalize error messages from
   "Router ..." to "Device ...". Keep method signatures (`getUsers(deviceId)` etc.) — the
   param is a device id.
6. **Refactor troubleshoot service** to use the resolver helper (it currently uses the SSH
   client; switch rows have `sshPort`, so the same path works).
7. **Refactor backup service** to use the resolver helper:
   - `createBackup` writes `switchId` when the resolved device is a switch, `routerId` otherwise.
   - `restoreBackup` / `createSafetyBackup` / `getRestoreHistory` do the same.
   - `getBackups` filter: keep `routerId` filter, add optional `switchId` filter.
   - Keep `storageKey` generation (`backups/{deviceId}/...`) unchanged — the id is unique.
   - Rename the internal `routerVersion` / `storageKey` fields only if the migration's
     storage key format must change (it must not — keep as-is).
   - Class/singleton naming: prefer `RouterOSGlobalBackupService` /
     `routerOSGlobalBackupService` for clarity; update the controller import accordingly.
8. **Update route mounts in `routes/index.ts`** — keep URL paths identical; only change the
   imported module paths/names.
9. **Frontend verification (no changes expected)** — confirm `frontend/app/stores/routeros/*`
   call paths still match. If any store or page references a service/class name directly
   (unlikely for HTTP-only clients), fix the reference. Frontend pages stay as-is.
10. **Search for stragglers** — grep the repo for the old filenames, old class names, and
    `prisma.router.findUnique` inside the renamed services to ensure none remain (except the
    routing service, which legitimately stays Router-only).
11. **Type-check / build** — run the backend TypeScript build and lint as the repo defines.

## Naming choice to apply in step 5–7

Keep class names as close to current as possible to limit churn:
- `RouterOSUserService` → `RouterOSGlobalUserService` (singleton `routerOSGlobalUserService`).
- `RouterOSTroubleshootService` → `RouterOSGlobalTroubleshootService`.
- `RouterOSBackupService` → `RouterOSGlobalBackupService`.
- `RouterOSRoutingService` (unchanged) in the renamed `routeros.router.routing.service.ts`.

If the user prefers zero class renames (only file renames), that is a valid fallback — flag it
before starting step 5, since it changes the diff size but not the design.

## Failure modes to handle

- **Id exists in neither table** → clear `Device not found: <id>` error (replaces
  "Router not found").
- **Device not ACTIVE** → keep existing non-active guard, message generalized to "Device".
- **Backup row with both `routerId` and `switchId` null** → should not occur; the service must
  always set exactly one. Add a guard in code; DB-level CHECK is optional (note as follow-up).
- **Existing router backups** keep `routerId` populated; queries that filter by `routerId`
  must not accidentally pick up switch rows (they won't, since switch rows have `routerId` null).
- **Frontend passes a switch id to backup endpoints** → now resolves via the Switch table and
  succeeds; previously 404/500. Verify the frontend switch pages actually call these endpoints
  (check `frontend/app/pages/switch.vue` and any switch detail modal) — if they don't yet,
  that is a separate UI task, not part of this backend change.

## Validation plan

1. **Build/typecheck** the backend; ensure the Prisma client regenerates cleanly.
2. **Router regression (must be unchanged):**
   - `GET /routeros/users/:routerId` style calls (via user controller) return the same data.
   - `GET /routeros/:routerId/bgp/connections` still works via the renamed routing service.
   - Existing backups for routers still list, download, restore.
3. **Switch path (new):**
   - Point the user service at a Switch row id → users listed.
   - Point troubleshoot at a Switch row id → ping/traceroute work.
   - Create a backup for a Switch row id → row created with `switchId` set, `routerId` null;
     restore creates a `BackupRestore` with `switchId` set.
4. **Negative:** a random uuid → `Device not found`.
5. **Migration safety:** confirm existing `router_backups` rows are untouched (still have
   `router_id`), and the migration is additive only.

## Out of scope / follow-ups

- `BackupSchedule` stays router-only (schedules currently key off `routerId`). Making schedules
  device-agnostic is a separate task.
- No frontend UI work unless the switch pages need new buttons to reach these endpoints.
- No unified `Device` model.
- No rename of HTTP URL paths (deliberately kept stable).

## Open questions

- None blocking. Confirm only the class-rename preference in step 5–7 (rename classes vs.
  rename files only) before starting that step.
