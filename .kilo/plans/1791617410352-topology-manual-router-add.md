# Plan: Manual "Add Router" to Topology (stop auto-adding all routers)

## Goal

Make routers behave like switches in the topology page: a router appears as a
node **only after it is manually added** to a company's topology. Users get an
"Add Router" flow (available list + add + remove) so they can control exactly
which routers are shown, instead of every router of the company rendering
automatically.

This mirrors the existing switch pattern already implemented for switches
(`SwitchTopologyLayout` + `/switch-layout/available|add|remove`).

## Decisions (confirmed with user)

1. **Explicit add only.** A router node renders only if a `TopologyLayout` row
   exists for `(companyId, routerId)`.
2. **Router↔router edge shown only when BOTH endpoints are manually added.**
   No "pull-in" of un-added routers as ghost nodes.
3. **Backfill existing routers.** On rollout, create a `TopologyLayout` row for
   every existing router of every company so current topologies are unchanged;
   users then remove what they don't want.

## Key facts from the codebase

- `TopologyLayout` already exists (`prisma/schema.prisma` lines 207–226),
  `@@unique([companyId, routerId])` — reuse it as the "router added" marker.
  The current drag-save already writes rows here, but `getTopology` ignores it.
- `getTopology` (`backend/src/services/router/router.connection.service.ts`
  ~line 144) currently returns **all** company routers as nodes and **all**
  router connections as edges, regardless of `TopologyLayout`.
- Switch behavior to mirror lives in:
  - Service `backend/src/services/switch/switch.layout.topology.service.ts`
    (`getAvailableSwitches`, `addSwitchToTopology`, `removeSwitchFromTopology`).
  - Controller `backend/src/controllers/switch.layout.controller.ts`.
  - Routes `backend/src/routes/router/topology.routes.ts` (lines 62–92).
- Frontend mirror: `frontend/app/components/topology/TopologyView.vue`
  (available-switch load ~line 56, add/remove ~80–129, "Add Switch" button
  overlay ~672–684, Add Switch modal ~1185–1258).
- `RouterLayoutService.upsertPosition` currently **auto-creates** layout rows on
  drag-save (`backend/src/services/router/router.layout.topology.service.ts`
  lines 76–118) — must change so drag-save never auto-adds a router.
- `frontend/app/pages/topology.vue` calls `topologyStore.fetchTopology`.

## Design

### Backend

1. **`RouterLayoutService` (router.layout.topology.service.ts)**
   - Add `getAvailableRouters(companyId)`: routers of any company with **no**
     `TopologyLayout` row for `companyId`. Own-company routers first, then by
     name (copy the switch sort). Include `company` for the owner label.
   - Add `addRouterToTopology(routerId, companyId, positionX?, positionY?)`:
     verify router exists, refuse duplicate (`P2002` → "Router is already in the
     topology"), create `TopologyLayout` with defaults `positionX ?? 400`,
     `positionY ?? 300`.
   - Add `removeRouterFromTopology(routerId, companyId)`: require a layout row
     for the company (else throw "Router is not in this company topology"),
     then delete the row and delete only **router↔router** `RouterConnection`
     rows where **both** endpoints belong to the company (same
     "company-owned devices only" guard used by the switch remover, lines
     141–189 of the switch layout service). Use a `$transaction`.
   - Change `upsertPosition` (and therefore `bulkUpsertPositions`): when a
     `companyId` is given and no layout row exists, **do not create** — return
     `null`/skip, matching the switch service. Only update existing rows.
     (Legacy/global fallback may keep upsert-create, as the switch service does.)

2. **`topology.layout.controller.ts`** — add handlers
   `getAvailableRouters`, `addRouter`, `removeRouter` with Zod validation
   (uuid routerId/companyId, optional positions in [-10000, 10000]), mirroring
   the switch controller; `P2002` → conflict message.

3. **`routes/router/topology.routes.ts`** — add, declared before the
   `/layout/:routerId` param route to avoid capture:
   - `GET  /layout/available` → `getAvailableRouters`
   - `POST /layout/add` (authenticate, requireAdmin) → `addRouter`
   - `POST /layout/remove` (authenticate, requireAdmin) → `removeRouter`

4. **`getTopology` (router.connection.service.ts)** — filter nodes and edges by
   the added set:
   - Query `TopologyLayout` for `companyId`, build `addedRouterIds`.
   - `routerNodes` = only routers whose id is in `addedRouterIds`
     (remove the "all company routers" behavior).
   - `routerEdges` = only connections where **both** `sourceRouterId` and
     `targetRouterId` are in `addedRouterIds`.
   - Keep the existing switch + foreign-endpoint logic. Note the switch branch
     (lines ~308–328) adds foreign **router** endpoints of visible switch
     connections; decide explicitly: leave that as-is (a router pulled in by a
     **switch** connection stays visible) OR also gate it on `addedRouterIds`.
     **Recommendation: gate it too**, so routers are always opt-in and the rule
     is uniform. Update `deviceIds` usage accordingly so edges never reference a
     hidden router.
   - Global view (no `companyId`): routers currently all render; switch logic
     already uses layout rows. Apply the same rule — show only routers that have
     a `TopologyLayout` row.

5. **Migration / backfill** — new Prisma migration folder under
   `backend/prisma/migrations/2026..._topology_layout_backfill/`:
   - `INSERT INTO topology_layouts (id, router_id, company_id, position_x,
     position_y, created_at, updated_at) SELECT gen_random_uuid(), r.id,
     r.company_id, 400, 300, now(), now() FROM routers r WHERE r.company_id IS
     NOT NULL ON CONFLICT (company_id, router_id) DO NOTHING;`
   - Verify the actual column names/constraint name in
     `20260213171552_add_topology_layout` before finalizing SQL.

### Frontend

6. **`frontend/app/stores/router/router.topology.ts`** — add
   `fetchAvailableRouters(companyId)`, `addRouterToTopology(routerId,
   companyId)`, `removeRouterFromTopology(routerId, companyId)` calling the new
   endpoints, each refreshing topology afterward (mirror `createSwitchConnection`
   refresh behavior).

7. **`frontend/app/components/topology/TopologyView.vue`**
   - Add "Add Router" button next to "Add Switch" (overlay ~672–684).
   - Add an "Add Router" modal mirroring the Add Switch modal (~1185–1258):
     `availableRouters`, `isLoadingAvailableRouters`, `isAddingRouter`,
     `loadAvailableRouters`, `openAddRouterModal`, `handleAddRouter`; owner
     label for foreign routers; empty-state text.
   - Add `handleRemoveRouterFromTopology` (confirm, POST `/layout/remove`,
     close detail panel, `emit('connectionCreated')`), shown in node detail
     panel for `nodeType === 'ROUTER'` (mirror switch removal).
   - Note: `savePositions` sends router positions via `saveNodePositions`; with
     the update-only backend change, un-added routers simply won't persist —
     acceptable since only added routers render.

### Docs

8. If a topology API doc exists (search `docs/` for topology), update it with
   the three new router-layout endpoints. Otherwise skip (no new doc files).

## Risks / edge cases

- **Cross-company visibility:** switch logic intentionally shows foreign
  endpoints of visible connections. Gating the foreign-**router** branch on
  `addedRouterIds` changes that behavior; confirm this is desired (recommended
  for uniformity) and note it explicitly.
- **Orphan edges:** ensure neither `routerEdges` nor the switch branch emits an
  edge whose endpoint router is hidden, or Vue Flow will drop the edge silently.
- **Existing auto-created layout rows:** drag-save already wrote rows for every
  company router, so in practice many routers may already be "added" before
  backfill. The backfill is still the source of truth for parity.
- **Admin gating:** add/remove require `requireAdmin` (same as switch add/remove).
- **Refresh contract:** `savePositions` debounce + `connectionCreated` emit must
  still trigger a full `fetchTopology` so node/edge sets recompute.

## Validation

- Backend: run the migration; confirm a company's routers get layout rows and
  the topology endpoint returns the same nodes/edges as before backfill.
- Remove a router → it disappears as a node and its router↔router edges vanish;
  re-add from the available modal → reappears.
- Add a router from a **foreign** company via the available list; verify owner
  label and that edges require both endpoints added.
- Drag-save a router position → persists for added routers; no new rows created
  for routers that were not added.
- Switch flow (`add`/`remove` switch, switch↔router edges) still behaves as
  before, including foreign endpoints per the chosen policy.
- Page-level: `frontend/app/pages/topology.vue` refresh, loading, and empty
  states still work; "Total Routers"/"Total Connections" counts reflect only
  added routers.

## Out of scope

- Redesigning topology layout/positioning or Vue Flow rendering.
- Changing switch behavior beyond the foreign-endpoint policy decision above.
- Auto-discovery behavior (`POST /discover/:routerId`).
