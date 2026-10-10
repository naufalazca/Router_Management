# Shared Switch Pool in Topology (Option A)

## Goal

Allow **any company** to add **any company's switch** to its own topology view (global shared pool),
instead of the current owner-only restriction. Layout positions are **per-company**: each viewing
company stores its own `(positionX, positionY)` for a shared switch.

## Current State / Evidence

- `backend/prisma/schema.prisma`
  - `Switch.companyId` is required (a switch has exactly one owning company).
  - `SwitchTopologyLayout` already allows many companies per switch:
    `@@unique([companyId, switchId])`. **No schema change needed.**
- `backend/src/services/switch/switch.layout.topology.service.ts` enforces owner-only:
  - `getAvailableSwitches()` filters `prisma.switch.findMany({ where: { companyId } })` → only own switches listed.
  - `addSwitchToTopology()` throws `'Switch does not belong to this company'` when `sw.companyId !== companyId`.
  - `upsertPosition()` throws the same on foreign switches.
  - `bulkUpsertPositions()` (recently rewritten) forces `companyId = ownerCompanyId` and **skips foreign switches**.
  - `removeSwitchFromTopology()` rejects foreign switches and deletes only connections whose endpoints are **all** company-owned (keep this connection-deletion rule).
- `frontend/app/components/topology/TopologyView.vue` already sends the **viewing** `companyId` on
  add/remove/fetch/bulk-save (lines ~78, ~101, ~186, ~206) and already renders `selectedNode.companyName`.
- `frontend/app/components/topology/TopologyView.vue` empty-state copy (line ~1234) says
  *"All company switches are already in the topology, or no switches exist yet."* — wording assumes owner-only.
- Router connections (`RouterConnection`) are out of scope; this plan only touches switch layout/add flow.

## Design Decisions

- **D1 — Access model:** Global shared pool. Every switch in the system is addable by any company.
- **D2 — Layout granularity:** Per-company positions. The `SwitchTopologyLayout` row uses the **viewing**
  company's `companyId`, independent from the switch owner. (No schema change; reuses existing unique key.)
- **D3 — Ownership semantics:** `Switch.companyId` remains the switch's owner (for display/credentialing).
  It no longer gates who may place the switch in their topology.
- **D4 — Connection deletion on remove:** Unchanged — only delete switch connections whose endpoints all
  belong to the removing company; foreign links survive.

## Tasks (ordered)

1. **Widen available list** — `switch.layout.topology.service.ts` `getAvailableSwitches(companyId)`:
   - Return **all** switches, excluding only those already placed in **this** company's layout
     (i.e., keep the `layouts where { companyId }` exclusion set, but drop `where: { companyId }` on the
     switch query).
   - Include owner company info (already `include: { company }`) so the UI can label foreign switches.
   - Consider ordering (e.g., own switches first, then by name) for a sensible list.

2. **Allow adding foreign switches** — `addSwitchToTopology(switchId, companyId, ...)`:
   - Remove the `if (sw.companyId !== companyId) throw 'Switch does not belong to this company'` guard.
   - Keep the "already in this company's topology" duplicate check (unique on `[companyId, switchId]`).
   - Keep `P2002` → `'Switch is already in the topology'` mapping in the controller.

3. **Per-company upsert** — `upsertPosition()`:
   - Remove the ownership guard.
   - Ensure the upsert keys on the **viewing** `companyId` (the layout row belongs to the viewing company),
     not the switch owner. If `companyId` is omitted, fall back to the switch owner (current behavior) as a
     global/default context.

4. **Per-company bulk upsert** — `bulkUpsertPositions()`:
   - Revert the owner-forcing rewrite: key `where.companyId_switchId` on the **viewing** `companyId`.
   - Remove the `if (companyId && ownerCompanyId !== companyId) return null` foreign-skip.
   - Keep parallelization and the null-filtering of unknown-switch results.

5. **Remove guard** — `removeSwitchFromTopology()`:
   - Remove the `sw.companyId !== companyId` guard.
   - Keep requiring that a layout row exists for `(companyId, switchId)` before removing.
   - Keep D4 connection-deletion logic unchanged.

6. **UI wording + owner label** — `TopologyView.vue`:
   - Update modal empty-state copy (line ~1234) to reflect the shared pool, e.g.
     *"No switches available to add. Either every switch is already in your topology, or no switches exist yet."*
   - Extend the `AvailableSwitch` interface/type with the owner company name (e.g. `companyName`).
   - In the Add Switch list item, label foreign switches with their owner company (e.g. show
     `company.name` when it differs from the current company). Optional but recommended for clarity.
   - No change needed to add/remove/bulk fetch — they already send the viewing `companyId`.

7. **Backend type safety** — update `mapSwitchNode`/topology service if the widened query returns switches
   whose owner differs from the viewing company; confirm `companyName` is populated so the detail panel shows
   the owner. (The topology visibility logic in `router.connection.service.ts` already exposes foreign switch
   nodes when a visible connection touches them; verify a standalone added foreign switch still appears as a
   node via the layout-driven path — see Validation.)

## Files to Change

- `backend/src/services/switch/switch.layout.topology.service.ts` (primary)
- `frontend/app/components/topology/TopologyView.vue` (copy + owner label)
- Possibly `backend/src/services/router/router.connection.service.ts` — only if a foreign switch added to a
  company's layout does **not** render as a node (verify first; see Validation step 2).

## Risks / Edge Cases

- **Node rendering for standalone foreign switch:** `router.connection.service.ts` currently includes switch
  nodes when (a) they have a layout for the company, or (b) a visible connection touches them. Confirm path (a)
  uses `switchTopologyLayouts where { companyId: viewing }` — it does — so adding B's switch to A's layout must
  make it appear in A's topology even with no connection. Validate explicitly.
- **Duplicate add:** unique `[companyId, switchId]` prevents double-add within the same company; P2002 mapping
  still returns a friendly message.
- **Removing a shared switch from A's topology must not affect B's layout or B's connections** — enforced by
  scoping delete to `(companyId, switchId)` and D4.
- **Concurrent drags** by different companies are independent (separate layout rows) — safe.
- **Credentials/visibility:** adding a foreign switch exposes its name/IP/status in the viewer's topology by
  design of option A. Flag if this is undesirable (would require option B, out of scope).

## Validation

1. **Add foreign switch:** As Company A, open Add Switch → confirm B's switches are listed (labeled with owner).
   Add one → 201, node appears in A's topology.
2. **Node appears without a connection:** Confirm the added foreign switch renders as a node in A's topology
   with no connection present (covers the `router.connection.service.ts` node-provision path).
3. **Independent positions:** Drag the shared switch in A's view; open B's view → B's position is unchanged.
   Re-fetch A → A's position persisted (row keyed by A).
4. **Remove:** Remove the shared switch from A's topology → gone from A; still present in B; A's own connections
   removed only if both endpoints were A-owned; any B-owned links survive.
5. **Empty state:** With all switches added, modal shows updated copy (no "company switches" wording).
6. **Backend checks:** Run the repo's existing lint/typecheck/test commands for backend and frontend
   (confirm exact scripts in `package.json` before running).

## Out of Scope

- Per-owner ACL / sharing grants (option B).
- Schema changes to `Switch` or `SwitchTopologyLayout`.
- Cross-company credential or permission enforcement beyond the global pool.
- Router-to-router connection sharing.

## Open Questions

- Should the Add Switch list **mark** foreign switches with the owner name (recommended: yes), or keep the list
  unlabeled for minimal UI change?
- Should foreign switches be visually distinguished (e.g., badge/border color) from own switches in the canvas?
  (Recommended: optional, non-blocking.)
