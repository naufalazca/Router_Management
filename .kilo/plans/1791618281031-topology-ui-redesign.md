# Topology Page — Full UI/UX Redesign (Vue Flow, glassmorphism, dark-mode aware)

## Goal

Redesign the network topology experience to be a clean, modern, minimalist, slightly
glassmorphic view where:

1. The canvas is comfortable and uncluttered.
2. Connections (edges) are visually distinct by **type** and **status** through
   multiple channels (color + line pattern + motion + labels), so connectivity is
   readable at a glance.
3. Connectivity is **explained in plain language** both inline (a reading guide /
   legend) and on demand (rich node/edge detail panels).

Design direction confirmed with user:
- **Full visual overhaul, keep `@vue-flow/core`** (no new graph deps).
- **Multi-channel edge encoding**: color + pattern + motion + labels.
- **Full-bleed canvas** with floating glass toolbars/panels.
- **Both**: inline reading guide **and** selection-driven detail panels.
- **Token-driven neutral base + semantic link palette**, moderate motion,
  respect `prefers-reduced-motion`.

## Scope

In scope (frontend only):
- `frontend/app/pages/topology.vue`
- `frontend/app/components/topology/TopologyView.vue`
- `frontend/app/components/topology/TopologyConnections.vue`
- New topology sub-components (custom node, custom edge, legend/guide, detail panels) under
  `frontend/app/components/topology/`.

Out of scope:
- Backend, API contracts, store methods (`router.topology.ts` behavior unchanged).
- New npm dependencies.
- Changes to the data model / field names.

## Key decisions

- **No new dependencies.** Use existing `@vue-flow/core`, `@vue-flow/background`,
  `@vue-flow/controls`, shadcn-vue components, `@nuxt/icon` + `@iconify-json/lucide`.
  Motion via CSS transitions/keyframes (no `motion-v`).
- **Token-first colors.** Replace every hardcoded hex (`#22c55e`, `#f97316`, …) with
  CSS variables / Tailwind token utilities that work in light **and** dark. Define a
  small semantic link palette in one place (see "Semantic palette") so legend, edges,
  and detail panels stay in sync.
- **Layout engine unchanged.** Keep circular/position-then-persist behavior
  (`fetchLayoutPositions` / `saveNodePositions` / switch bulk save must keep working).
  Improve spacing/radius only; do not add dagre/elk.
- **Preserve all existing behavior/flows exactly**: node & edge click, connect flow
  (`ConnectionMode.Loose`, click-to-connect + drag), create/update/delete connection,
  add/remove router & switch, view/edit switch detail fields, Esc-to-cancel, debounced
  position save, `emit('connectionCreated')` refresh, `companyId` guards.

## Reference: data available

**Node** (`TopologyNode`): `id`, `name`, `ipAddress`, `location?`, `nodeType` (`ROUTER`|`SWITCH`),
`routerType?` (`UPSTREAM`|`CORE`|`DISTRIBUSI`|`WIRELESS`), `routerBrand?`, `status`
(`ACTIVE`|`INACTIVE`|`MAINTENANCE`), `companyName?`, `brand?`, `portCount?`.

**Edge** (`TopologyEdge`): `id`, `source`, `target`, `linkType`
(`ETHERNET`|`FIBER`|`WIRELESS`|`VPN`), `linkStatus` (`ACTIVE`|`INACTIVE`|`PLANNED`),
`sourceInterface?`, `targetInterface?`, `bandwidth?`, `distance?`, `isAutoDiscovered`,
`edgeType?` (`ROUTER`|`SWITCH`), `sourcePortNumber?`, `targetPortNumber?`, `vlan?`,
`speed?`, `notes?`.

## Semantic palette (single source of truth)

Create `frontend/app/components/topology/topology-visual.ts` exporting maps used by the
custom edge, legend/guide, and detail panels. Use OKLCH consistent with `tailwind.css`.
Provide both a `light` and `dark` token per entry (or reference existing `--chart-*` /
Tailwind color utilities that already adapt via the `.dark` class).

- **By linkType (color):** ETHERNET = emerald/green, FIBER = sky/blue, WIRELESS = amber/orange,
  VPN = violet/purple, fallback = muted slate.
- **By linkStatus (pattern + motion + opacity):**
  - `ACTIVE` → solid stroke, full opacity, animated flow (dash offset or traveling dot), thicker.
  - `PLANNED` → dashed stroke (`6 6`), muted opacity, no motion.
  - `INACTIVE` → dotted stroke (`2 4`), low opacity, no motion, danger-tinted.
- **Switch links** (`edgeType === 'SWITCH'`) keep a distinct treatment (teal accent) layered
  on top of the type color.
- **Nodes by routerType:** UPSTREAM blue, CORE green, DISTRIBUSI purple, WIRELESS orange,
  default slate; **SWITCH** teal; **status** overrides via a status ring/badge (ACTIVE /
  MAINTENANCE amber / INACTIVE red) rather than recoloring the whole card, so type stays readable.
- Every color value must have ≥4.5:1 contrast for text and ≥3:1 for meaningful graphics in
  both themes. Verify dark mode independently.

`topology-visual.ts` should also export label helpers (e.g. human-readable linkType label,
status label, a one-line description string for the reading guide).

## Tasks (ordered)

1. **Create `topology-visual.ts`** — linkType/linkStatus/nodeType metadata: color tokens
   (light+dark), line style (`strokeDasharray`, width), motion flag, human labels, and
   short plain-language descriptions for the guide. No component imports.

2. **Create `TopologyNode.vue`** (custom node) — glassy rounded card: node icon (router vs
   switch), name, IP (mono), type chip, status dot/ring. Rendered compact, fixed min width,
   no layout shift on hover (use shadow/scale-free or transform-safe states). Handles
   (`sourcePosition`/`targetPosition`) styled large enough with a hit area (~28px pseudo),
   visible on hover, themed in light/dark. Selected state = ring highlight.

3. **Create `TopologyEdge.vue`** (custom edge) — render an SVG path (rounded/smooth, e.g.
   `getSmoothStepPath` or bezier) using `topology-visual` style by `linkType`+`linkStatus`.
   Include:
   - animated flow for ACTIVE (CSS `stroke-dashoffset` animation; static under
     `prefers-reduced-motion`),
   - a small always-visible **pill label** showing linkType + bandwidth (themed, glass),
     gracefully hidden when zoomed out or when it would crowd → fall back to hover label,
   - a widened invisible hit path for easier click,
   - hover/focus emphasis (brighter stroke + thicker) without moving endpoints.
   Wire the graph to use this via `:edges` `type: 'topology'` and register the custom node
   type (either `template #node-...` slots or a `nodeTypes` map) in `TopologyView.vue`.

4. **Create `TopologyLegend.vue`** — floating glass panel (bottom-right), collapsible:
   - sections for **Router/Device types**, **Connection types** (color), **Connection status**
     (pattern/motion), with a tiny visual sample per row (colored chip / line swatch).
   - a toggle to open a **"How to read this map"** mini-guide with one-line plain-language
     explanations per entry (from `topology-visual.ts`).
   - accessible: real `<button>`s, `aria-expanded`, keyboard operable, `aria-hidden` on
     decorative swatches.

5. **Create `TopologyDetailPanel.vue`** — glass sheet/drawer (shadcn `Sheet` or absolutely
   positioned glass panel) that renders either a **selected node** or **selected edge**:
   - Node view: identity (name, IP, type, status badge, brand, portCount, location, company)
     + a "Connections (N)" list of every linked device with linkType/status/bandwidth per row.
   - Edge view: type, status, bandwidth, distance, source/target interfaces, VLAN, speed,
     switch ports, auto-discovered note, and plain-language summary sentence.
   - Reuse the existing action flows: node → Create Connection / Remove from Topology
     (router & switch variants); edge → Edit / Delete. This absorbs/replaces the current
     inline modals in `TopologyView.vue` and `TopologyConnections.vue`.
   - Keep all existing submit/validation/error handling; use shadcn `Button`, `Badge`,
     `Select`, `Input`, `Textarea`, `Label`.

6. **Rewrite `TopologyView.vue`** as a **full-bleed canvas**:
   - Canvas fills available height (`height: max(70vh, 560px)` or flex-grow), rounded,
     `overflow-hidden`, subtle glass/grid backdrop; `<Background>` + `<Controls>` themed.
   - **Floating glass toolbar** (top-left): Add Router, Add Switch, Refresh (icons +
     labels), styled as glass buttons; disabled when `!companyId`.
   - **Floating glass stat chips** (top-right): Total Routers / Total Connections / Company.
   - **Floating glass legend + reading guide** (bottom-right) via `TopologyLegend.vue`.
   - **Connecting hint** pill (center-top) unchanged behavior, restyled.
   - Detail panel via `TopologyDetailPanel.vue`; keep `TopologyConnections` edit logic
     (can be folded into the panel or kept as the edit form inside it).
   - Preserve: `useVueFlow` hooks (`onNodeDragStop`, `onPaneReady`, `startConnection`),
     `initializeNodes` circular layout + saved positions, `syncEdges`, debounced
     `savePositions` (router + switch bulk), Esc handler, all handlers, all emits.
   - Custom node/edge registration + `MarkerType.ArrowClosed` retained for direction.

7. **Rewrite `topology.vue`** page shell:
   - Keep company fetch/select logic; **redesign the "Select a Company" empty state** as a
     clean glass hero with company cards (icons instead of raw emoji-free SVGs kept, hover lift).
   - Error alert → token-based (`destructive`) glass alert.
   - Selected state: page renders the full-bleed `TopologyView` with a slim glass context
     header (company name + Change Company + Refresh) instead of the heavy bordered card.
   - Remove now-redundant duplicated loading/empty markup that moved into the canvas.
   - Keep `TopologyView` `v-if` loading/empty (`nodeCount === 0`) states, restyled as
     glass overlays on the canvas.

8. **Responsive & a11y pass**:
   - Floating toolbars: collapse labels to icons on narrow screens; ensure panels don't
     cover the canvas on mobile (guide/legend become a bottom sheet).
   - All interactive elements: `cursor-pointer`, visible `focus-visible` ring, hover
     transitions 150–300ms, `aria-hidden` on decorative icons, accessible names on icon-only
     buttons.
   - Respect `prefers-reduced-motion`: disable edge flow animation and hover transforms.
   - Verify light + dark contrast independently; verify at 375 / 768 / 1024 / 1440.

## Files to change / create

- Edit: `frontend/app/pages/topology.vue`
- Edit: `frontend/app/components/topology/TopologyView.vue`
- Edit/absorb: `frontend/app/components/topology/TopologyConnections.vue` (edit form kept,
  view mode folded into the detail panel)
- New: `frontend/app/components/topology/topology-visual.ts`
- New: `frontend/app/components/topology/TopologyNode.vue`
- New: `frontend/app/components/topology/TopologyEdge.vue`
- New: `frontend/app/components/topology/TopologyLegend.vue`
- New: `frontend/app/components/topology/TopologyDetailPanel.vue`

## Risks / constraints

- **TypeScript vs `@vue-flow` types**: `flowNodes`/`flowEdges` are intentionally `any[]`
  (existing comment about motion-v/TS2589). Keep that pattern; don't "fix" types here.
- **Vue Flow custom node/edge registration** must be done in a way that survives the
  `v-model:nodes`/`v-model:edges` sync and temp connect edges; verify drag-to-connect and
  click-to-connect still work with custom edges.
- **Position save must not regress**: node `id`/`position` shape is consumed by
  `savePositions` (router vs switch routing by `data.nodeType`). Custom node must keep
  `data` = the `TopologyNode`.
- **Edge label clutter**: many nodes → labels overlap. Implement graceful degradation
  (hide labels below a zoom threshold; show on hover/selection).
- **Dark mode**: existing hardcoded hexes break in dark mode today; the new palette must be
  validated in both themes (do not assume light values work in dark).

## Validation

- `npm run typecheck` and `npm run lint` in `frontend/`.
- Manual (light + dark):
  - Select company → topology renders full-bleed; stats/legend/toolbar are glass and legible.
  - All edge types + statuses visually distinct (color/pattern/motion); ACTIVE links animate.
  - Click node → detail panel shows device info + connection list; Create Connection and
    Remove from Topology (router & switch) work and refresh.
  - Click edge → detail panel shows all fields + plain-language summary; Edit saves; Delete
    removes and refreshes.
  - Click-to-connect, drag-to-connect, Esc-to-cancel, existing-connection guard, self-connect
    guard still behave.
  - Drag a node → reload → position persists (router + switch).
  - Add Router / Add Switch modals add and refresh.
  - `prefers-reduced-motion`: no flow animation / transforms.
  - Responsive at 375 / 768 / 1024 / 1440; no overlap failures; focus rings visible.

## Open questions

- None blocking. Optional: whether to keep the old inline modals as-is inside the new
  panel vs. fully restyling them — plan assumes restyle via shadcn components while
  preserving logic.
