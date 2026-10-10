# Plan: Switch CRUD + Cross-Company Topology Integration

## Goal

Add a first-class **Switch** entity that always belongs to exactly one Company, plus a
separate **SwitchConnection** model, so that:

- Switches get full CRUD (create / read / update / delete) via backend API + a `/switch` UI page.
- A switch owned by Company A can appear on Company B's topology view when a link connects
  Company B's devices to that switch (the "company connected through another company's switch" case).
- The topology canvas renders both routers and switches as nodes and merges two edge sources
  (`RouterConnection` + `SwitchConnection`).

## Confirmed decisions

1. **Separate `Switch` model** — NOT merged with `Router`. Fields include required `companyId`,
   inventory data, and **encrypted RouterOS credentials** (username + AES-256-GCM password, apiPort/sshPort),
   because switch management reuses the user-management and backup subsystems.
2. **New separate table `switch_connections`** — explicitly NOT merged with `router_connections`
   (user rationale: switch function differs from routing; only user + backup subsystems overlap).
3. **`SwitchConnection` supports Switch↔Switch AND Router↔Switch.** One endpoint may be a Router,
   the other a Switch (or both may be Switches). Modeled with explicit nullable FK pairs and a
   DB-level CHECK that each connection has exactly two populated endpoints.
4. **SwitchConnection columns** = RouterConnection columns (linkType, linkStatus,
   source/target interface, bandwidth, distance, isAutoDiscovered, notes) **plus switch detail**:
   `sourcePortNumber`, `targetPortNumber`, `vlan`, `speed`.
5. **Cross-company rule**: a switch appears in Company B's topology **if a link exists** that
   touches Company B (no explicit sharing flag).
6. **Storage**: separate table; topology service merges the two edge sources when building nodes/edges.
7. **UI scope**: full `/switch` CRUD page + sidebar entry + automatic switch nodes in `TopologyView`
   + connection dialog that allows Router or Switch endpoints.

## Key context (verified)

- Prisma **5.22**, PostgreSQL, single client at `backend/src/lib/prisma.ts`.
- Migrations are plain SQL in `backend/prisma/migrations/<timestamp>_<name>/migration.sql`.
  Run via `cd backend; npm run prisma:migrate` (dev) / `prisma:migrate:prod` (deploy). Use `prisma migrate dev --create-only` if a hand-edited CHECK constraint must be added to the generated SQL before applying.
- Encryption helper: `backend/src/lib/encryption.ts` → `encrypt(text)` / `decrypt(text)` (AES-256-GCM, key from `ENCRYPTION_KEY`).
- Backend layering: `routes/*.routes.ts` → `controllers/*.controller.ts` → `services/*.service.ts`,
  Zod validators in `validators/`, mounted in `backend/src/routes/index.ts`. Auth: `authenticate`, `requireAdmin` from `middleware/auth.ts`.
- Existing topology source of truth: `RouterConnectionService.getTopology()` in
  `backend/src/services/router/router.connection.service.ts` returns `{ nodes, edges }`.
  Nodes currently typed as `TopologyNode` (router-centric); edges as `TopologyEdge`.
- Frontend topology: `frontend/app/stores/router/router.topology.ts` (`TopologyNode`/`TopologyEdge`/`TopologyData`),
  `pages/topology.vue`, `components/topology/TopologyView.vue` (Vue Flow; node color keyed on `routerType`),
  `components/topology/TopologyConnections.vue`.
- Layout positions: `TopologyLayout` is keyed `@@unique([companyId, routerId])` and FK to `Router`.
  Switch node positions are handled in this plan via a new `SwitchTopologyLayout` model (see Task 2).
- CRUD UI pattern to mirror: `pages/company.vue` + `components/company/*`, and
  `pages/router.vue` + `components/router/*` + `stores/router.ts` (shadcn Dialog/Table/Select, vue-sonner toasts,
  field-level validation composable `composables/validator/router/useRouterValidation.ts`).
- Sidebar menu: `frontend/app/constants/menus.ts` (`navMenu`).
- Enums already present and reusable: `LinkType`, `LinkStatus`. Router uses `RouterStatus` and `RouterBrand` (MIKROTIK/UBIVIQUITI) — reuse `RouterBrand` for switch brand; reuse `RouterStatus` values OR introduce `SwitchStatus` (prefer reuse to avoid churn — see Open Question 1).

## Out of scope

- RouterOS live switch integration (auto-discovery, live port status, VLAN push).
- Switch backup execution wiring (only credentials reuse is in scope; the backup subsystem itself is untouched).
- RBAC changes beyond existing `authenticate` / `requireAdmin`.

---

## Task list (ordered)

### 1. Prisma schema — `backend/prisma/schema.prisma`
Add models and enums:

- `model Switch`:
  - `id String @id @default(uuid())`
  - `name String`
  - `ipAddress String @map("ip_address")`
  - `macAddress String? @map("mac_address")`
  - `model String?`
  - `location String?`
  - `portCount Int? @map("port_count")`
  - `status RouterStatus @default(ACTIVE)` (reuse; see Open Question 1)
  - `brand RouterBrand @default(MIKROTIK) @map("router_brand")` (reuse)
  - `companyId String @map("company_id")` — **required** (switch always belongs to a company)
  - `username String @default("admin")`
  - `password String @default("")` — AES-256-GCM encrypted
  - `apiPort Int? @default(8728) @map("api_port")`
  - `sshPort Int? @default(22) @map("ssh_port")`
  - `createdAt`, `updatedAt`
  - relations: `company Company @relation("CompanySwitches", fields: [companyId], references: [id], onDelete: Cascade)`
  - topology relations: connectionsAsSource/AsTarget (see below), `switchTopologyLayouts SwitchTopologyLayout[]`
  - `@@index([companyId])`, `@@map("switches")`

- `model SwitchConnection` (`@@map("switch_connections")`):
  - `id String @id @default(uuid())`
  - nullable endpoint FKs (exactly two populated per row):
    - side A: `sourceSwitchId String? @map("source_switch_id")`, `sourceRouterId String? @map("source_router_id")`
    - side B: `targetSwitchId String? @map("target_switch_id")`, `targetRouterId String? @map("target_router_id")`
  - `companyId String? @map("company_id")` — owning company of the link (nullable to mirror RouterConnection)
  - `linkType LinkType @default(ETHERNET)`, `linkStatus LinkStatus @default(ACTIVE)`
  - `sourceInterface String?`, `targetInterface String?`
  - `sourcePortNumber Int? @map("source_port_number")`, `targetPortNumber Int? @map("target_port_number")` (switch detail)
  - `vlan Int?`, `speed String?` (switch detail)
  - `bandwidth String?`, `distance Decimal? @db.Decimal(10, 2)`
  - `isAutoDiscovered Boolean @default(false) @map("is_auto_discovered")`, `notes String? @db.Text`
  - `createdAt`, `updatedAt`
  - relations with `onDelete: Cascade` for switch FKs; for router FKs use `onDelete: Cascade` too (router deletion removes links).
  - `@@index` on each FK column + `@@index([linkStatus])`, `@@map("switch_connections")`

- `model SwitchTopologyLayout` (`@@map("switch_topology_layouts")`) — mirror `TopologyLayout` so switches can be dragged/positioned per company topology:
  - `id`, `switchId String @map("switch_id")`, `companyId String? @map("company_id")` (null = global view)
  - `positionX Decimal @db.Decimal(10,2)`, `positionY Decimal @db.Decimal(10,2)`, `createdAt`, `updatedAt`
  - `@@unique([companyId, switchId])`, `@@index([companyId])`

Add relations onto existing models:
- `Company`: `switches Switch[] @relation("CompanySwitches")`, plus `switchConnections SwitchConnection[]` (if a named relation is added) and `switchTopologyLayouts SwitchTopologyLayout[]`.
- `Router`: add back-relations for `SwitchConnection` (source/target) so the router FK side compiles.

**CHECK constraint** (required — Prisma cannot express it; add by hand to the generated migration SQL before applying, or in a follow-up migration):
```sql
ALTER TABLE "switch_connections"
  ADD CONSTRAINT "switch_connections_two_endpoints_check"
  CHECK (
    (("source_switch_id" IS NOT NULL)::int + ("source_router_id" IS NOT NULL)::int) = 1
    AND
    (("target_switch_id" IS NOT NULL)::int + ("target_router_id" IS NOT NULL)::int) = 1
  );
```

### 2. Migration
Run `cd backend; npm run prisma:migrate` (dev). If the CHECK constraint is lost, use
`npx prisma migrate dev --create-only --name add_switches`, hand-edit the SQL to append the CHECK +
indexes, then `npx prisma migrate dev`. Confirm `prisma generate` output includes `Switch`, `SwitchConnection`, `SwitchTopologyLayout`.

### 3. Backend — Switch CRUD
Mirror the Company/Router modules exactly.

- `backend/src/validators/switch/switch.validator.ts`:
  - `switchIdParamSchema = z.object({ id: z.string().uuid() })`
  - `createSwitchSchema`: `name` (min 1), `ipAddress` (reuse `hostSchema` pattern from `validators/router/router.validator.ts` — IPv4 or hostname), `macAddress?`, `model?`, `location?`, `portCount?` (int positive), `status?` enum, `brand?` enum, **`companyId` required uuid**, `username` (min 1), `password` (min 1), `apiPort?` (coerce int positive), `sshPort?`.
  - `updateSwitchSchema`: all optional, `password` transformed (`''` → undefined), `companyId` optional uuid (do NOT allow clearing to null — it is required).
- `backend/src/services/switch/switch.service.ts`:
  - `getAllSwitches()` — include `company { id, name, code }` + `_count` if needed.
  - `getSwitchById(id)` — include company; **decrypt** password in the response (mirror CompanyService which returns decrypted password).
  - `createSwitch(data)` — `encrypt(password)` before `prisma.switch.create`.
  - `updateSwitch(id, data)` — re-encrypt if password present; never store plaintext.
  - `deleteSwitch(id)`.
- `backend/src/controllers/switch.controller.ts`: `getAll`, `getById`, `create` (Zod parse → 400 with `errors` on `ZodError`), `update`, `delete` (204). Follow `company.controller.ts` response shapes: `{ status: 'success', data }` / `{ status: 'error', message, errors? }`.
- `backend/src/routes/switch.routes.ts`: `router.use(authenticate); router.use(requireAdmin);` then
  `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`.
- Mount in `backend/src/routes/index.ts`: `router.use('/switches', switchRoutes);`.

### 4. Backend — SwitchConnection CRUD
- `backend/src/validators/switch/switch.connection.validator.ts`:
  - `createSwitchConnectionSchema`: source/target as a tagged pair. Accept
    `{ source: { switchId?, routerId? }, target: { switchId?, routerId? }, linkType?, linkStatus?, sourceInterface?, targetInterface?, sourcePortNumber?, targetPortNumber?, vlan?, speed?, bandwidth?, distance?, notes? }`
    and refine: each side has exactly one of switchId/routerId; sides differ.
  - `updateSwitchConnectionSchema`: partial of the above.
- `backend/src/services/switch/switch.connection.service.ts`: validate referenced devices exist,
  reject self-link, compute `companyId` from the involved switch/router company, dedupe against existing
  (same endpoints + interfaces), `create` / `findMany` / `findUnique` / `update` / `delete`.
- `backend/src/controllers/switch.connection.controller.ts`: `getAll`, `getById`, `create`, `update`, `delete`.
- Routes: mount under the topology namespace so the frontend reuses one fetch path, e.g.
  in `topology.routes.ts` add `POST/PUT/DELETE /switch-connections` (+ GET), OR a dedicated `switch.connection.routes.ts` mounted at `/api/switch-connections`. **Prefer mounting at the topology namespace** and merging reads in the topology service (Task 5) to keep the canvas single-source (see Open Question 2).

### 5. Backend — merge switch nodes/edges into topology
Extend `backend/src/services/router/router.connection.service.ts::getTopology(companyId?)` (this is the service behind `GET /api/router/topology`):

- Fetch switches: nodes = routers ∪ switches. For cross-company visibility, select
  **switches whose `companyId` = companyId, UNION switches referenced by any `SwitchConnection` that also
  touches a device owned by `companyId`** (i.e. an edge exists between a Company-B device and the switch).
  Implementation: first resolve the set of Company B device IDs (routers + switches with companyId = B),
  then pull the IDs of switches appearing as the other endpoint of any `SwitchConnection` touching that set.
- Extend node shape with a discriminator: add `nodeType: 'ROUTER' | 'SWITCH'` and keep existing router fields;
  for switches set `routerType` to a neutral value the UI can branch on (do not overload semantics) — see Open Question 3.
- Edges = `RouterConnection` edges (existing) **plus** `SwitchConnection` edges mapped to
  `{ id, source, target, linkType, linkStatus, sourceInterface, targetInterface, bandwidth, distance, isAutoDiscovered }`
  (plus pass through `vlan`/`speed`/port numbers in `data`).
- Preserve the existing company filter semantics for router edges (`OR` on source/target/companyId).

### 6. Backend — switch layout (optional but included for parity)
Add switch layout CRUD mirroring `TopologyLayoutController`/`RouterLayoutService`:
`SwitchLayoutService` (`backend/src/services/switch/switch.layout.topology.service.ts`) + controller + routes
(`/api/router/topology/switch-layout`, `/bulk`, `/:switchId`, `/company/:companyId`). If the team prefers
deferring drag-persistence for switches, the canvas can still render switch nodes with default positions —
mark as Open Question 4.

### 7. Frontend — Switch store + page + modals
- `frontend/app/stores/switch.ts`:
  - Types `Switch`, `CreateSwitchInput`, `UpdateSwitchInput` mirroring `stores/router.ts` (include `company`, `companyId` required).
  - Actions: `fetchSwitches`, `fetchSwitchById`, `createSwitch`, `updateSwitch`, `deleteSwitch`, `clearError`.
  - Reuse `extractApiErrorMessage` (export it from `stores/router.ts` or move to a shared module — prefer importing from `~/stores/router`).
  - Getters: `switchCount`, `switchesByCompany`, `getSwitchById`.
- `frontend/app/pages/switch.vue`: copy structure from `pages/company.vue` / `pages/router.vue`
  (header + stats + search + `Table` + create/edit/view/delete modals; vue-sonner toasts).
- `frontend/app/components/switch/`: `SwitchCreateModal.vue`, `SwitchEditModal.vue`, `SwitchViewModal.vue`, `SwitchDeleteDialog.vue`.
  Mirror `components/router/RouterCreateModal.vue`: Dialog + Select for Company (required here, unlike router's optional),
  Status, Brand; Inputs for name/model/location/portCount/ipAddress/macAddress, and a Credentials section (username/password/apiPort/sshPort).
- Add a validation composable `frontend/app/composables/validator/switch/useSwitchValidation.ts` mirroring `useRouterValidation.ts` (companyId required, ipAddress format, password required on create).
- `frontend/app/constants/menus.ts`: add `{ title: 'Switches', icon: 'i-lucide-network' (or 'i-lucide-radio-tower'), link: '/switch' }` in the General group.

### 8. Frontend — topology integration
- `frontend/app/stores/router/router.topology.ts`:
  - Extend `TopologyNode` with `nodeType: 'ROUTER' | 'SWITCH'` and optional switch fields (`portCount`, `brand`).
  - Extend `TopologyEdge` with optional `vlan`, `speed`, `sourcePortNumber`, `targetPortNumber`.
  - Add `createSwitchConnection`, `updateSwitchConnection`, `deleteSwitchConnection` (mirroring the existing `createConnection` etc.).
- `frontend/app/components/topology/TopologyView.vue`:
  - `initializeNodes`: branch on `node.nodeType`; different color/shape for switches; keep router colors as-is.
  - `getNodeColor`: add a switch branch (distinct color) so switches are visually distinguishable.
  - Connection dialog (`newConnection`): change source/target from plain router IDs to a device picker
    that offers routers AND switches from `props.nodes`, then submit to the correct endpoint
    (router-router → existing connection API; anything involving a switch → switch-connection API).
  - Node detail dialog: show switch-specific fields when `nodeType === 'SWITCH'`.
- `frontend/app/components/topology/TopologyConnections.vue`: handle switch-edge details (vlan, speed, port numbers) and route update/delete to the switch-connection API when the edge is a switch edge.

### 9. Validation
- Backend: `cd backend; npm run build` (tsc) must pass; `npx prisma generate` clean; start dev server and
  `curl` the new endpoints (`/api/switches`, `/api/switch-connections`, `/api/router/topology?companyId=...`).
- Frontend: `cd frontend; npm run lint` (and `npm run build`/SSR if time permits).
- Manual scenario (the key acceptance test):
  1. Create Company A and Company B. Create a Router in Company B. Create a Switch in Company A.
  2. Create a `SwitchConnection` between Company B's router and Company A's switch.
  3. Load topology for Company B → both the Company-B router AND the Company-A switch render as nodes,
     joined by the switch edge. Load topology for Company A → switch shows; the B router shows only if a
     linked edge touches A (per the "tampil jika ada link" rule on the visible side).
  4. CRUD a switch: create → appears in `/switch` table & company's switch count; edit → persists; delete → node disappears from topologies.

## Risks / gotchas

- **CHECK + Prisma**: `prisma migrate dev` will not emit the CHECK constraint; it must be hand-added to the migration SQL and can be dropped by future regenerate. Document it and re-add if lost.
- **Topology node shape change**: adding `nodeType` touches `TopologyView.vue` node typing which already uses `any[]` due to vue-flow/motion-v type conflicts — keep that workaround, do not attempt to restore strict `Node[]`.
- **Encrypted password exposure**: CompanyService returns a decrypted password on single-fetch; matching that for switches is consistent but is an intentional security tradeoff — mirror existing behavior, don't invent a new policy.
- **Cross-company leakage**: the topology query must ONLY return a foreign switch when a connecting edge exists; avoid a naive `findMany({ where: { companyId } })` that returns the wrong set. Reuse the router-edge `OR` precedent.
- **Router deletion cascade**: adding `SwitchConnection.sourceRouterId/targetRouterId` with `onDelete: Cascade` means deleting a router deletes router↔switch links — intended, but call out to avoid surprise.
- **Menu icon**: confirm the chosen Lucide icon name exists in the `i-lucide-*` set used by the sidebar.

## Open questions (resolve during implementation if not now)

1. Reuse `RouterStatus`/`RouterBrand` for switches, or introduce dedicated `SwitchStatus`/`SwitchBrand` enums? Recommendation: **reuse** to minimize churn and keep UI select options shared.
2. Mount switch-connection routes at the topology namespace (`/api/router/topology/switch-connections`) vs a standalone `/api/switch-connections`. Recommendation: **topology namespace** for a single canvas fetch path; expose a standalone read too only if the `/switch` page needs raw connection lists.
3. How to represent switches in the existing router-centric `TopologyNode` (`routerType`) field. Recommendation: add a separate `nodeType` discriminator and leave `routerType` undefined/neutral for switches, rather than faking a router type.
4. Include switch drag-position persistence (`SwitchTopologyLayout`) in this iteration, or render with default circular/auto layout only? Recommendation: **include** for parity, but it can be deferred without blocking the core feature.

## Validation checklist
- [ ] `npx prisma migrate dev` applies with the CHECK constraint present in `switch_connections`.
- [ ] `cd backend; npm run build` passes.
- [ ] `GET/POST/PUT/DELETE /api/switches` work with auth; validation errors return `{ status:'error', errors }`.
- [ ] `POST /api/.../switch-connections` rejects self-links and multi-endpoint sides.
- [ ] `GET /api/router/topology?companyId=B` returns Company-A switch node + the linking edge.
- [ ] `/switch` page CRUD works end-to-end with toasts.
- [ ] `cd frontend; npm run lint` passes.
