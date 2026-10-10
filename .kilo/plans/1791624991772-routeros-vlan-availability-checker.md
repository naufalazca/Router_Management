# Plan: RouterOS VLAN Availability Checker (Router + Switch)

## Goal

Add a read-only feature that lists the VLANs present on a RouterOS device, with each
VLAN's member ports resolved to interface **name + comment**, so the UI shows the same
mapping the terminal does (e.g. `sfp-sfpplus2 | Nexus CCR 2116`).

Triggered by the user showing `/interface bridge vlan print` output and noting the real
problem: **the ports must be mapped first**.

## Decisions locked with the user

1. **Data sources (all three):**
   - `/interface bridge vlan print` — bridge VLAN table (the exact output supplied).
   - `/interface vlan print` — L3 VLAN interfaces (e.g. `vlan1300`).
   - Merged output: one entry per **unique VLAN id**, each with its tagged/untagged port
     list — the primary view.
2. **Port→comment mapping: join with `/interface print` in the backend.**
   Query `/interface print` once, build `name → { type, comment, running, disabled }`, then
   annotate every port in the VLAN rows. Do not rely on the API returning
   `"name | comment"` strings.
3. **Placement:** new page `/routeros/vlan` (mirrors `pages/routeros/troubleshoot_ping.vue`),
   with a device picker in the header; add a menu entry under "Router Management"
   (`frontend/app/constants/menus.ts`).
4. **Device scope:** device-agnostic (Router **and** Switch) via the existing
   `resolveDevice()` (Switch first, fallback Router).
5. **Transport:** RouterOS **API** (port 8728) using `RouterOSClient`, like the BGP/routing
   service — not SSH.
6. **No DB enrichment:** purely live from the device. Do NOT join `SwitchConnection`. The
   port comment on the device is the only source of the neighbor name.

## Key context (verified)

- **Device-agnostic pattern already exists:**
  `backend/src/lib/routeros/resolve-device.ts` → `resolveDevice(deviceId)` (Switch first,
  then Router; returns decrypted password, `apiPort`, `sshPort`, `status`) and
  `assertDeviceActive(device)`.
- **API client:** `backend/src/lib/routeros/client.ts` → `RouterOSClient`
  (`connect()`, `execute(command, params)`, `disconnect()`). `execute` returns
  `{ success, data?: any[], error? }` and maps params: `?key=value` stays a query,
  everything else becomes `=key=value`.
- **Closest existing service to mirror:** `backend/src/services/routeros/routeros.router.routing.service.ts`
  (structured API prints + parse-to-camelCase + private `getRouterClient`). New service uses
  `resolveDevice` instead of the router-only lookup.
- **Routing/validation/controller/route conventions:**
  - Routes: `backend/src/routes/routeros/*.routes.ts`, mounted in `routes/index.ts`;
    `router.use(authenticate); router.use(requireAdmin);`
  - Controller: `backend/src/controllers/routeros/*.controller.ts`, exports named handlers,
    responses shaped `{ status: 'success', data }`, errors via `next(error)`.
  - Validator: `backend/src/validators/routeros/*.validator.ts` (Zod). Param schema pattern:
    `z.object({ routerId: z.string().uuid() })`.
- **Frontend conventions:** Pinia store in `frontend/app/stores/routeros/*.ts` using
  `useApiFetch()` → `$apiFetch`, returning `{ success, data }`; page in
  `frontend/app/pages/routeros/*.vue`; device picker via
  `frontend/app/composables/useRouterosDevices.ts` (`devices`, `findDevice`, `fetchDevices`).
- **RouterOS command facts:**
  - Bridge VLAN rows expose `vlan-ids` (comma/range list, e.g. `1300`, `1`), `current-tagged`
    and `current-untagged` (space-separated port lists), `bridge`, `disabled`, `dynamic`.
  - `/interface vlan print` rows expose `.id`, `name`, `vlan-id`, `interface` (parent),
    `disabled`, `dynamic`.
  - `/interface print` rows expose `name`, `type`, `comment`, `running`, `disabled`.

## Scope

- **In:** backend service + validator + controller + routes; frontend store + page + menu;
  merged unique-VLAN list with tagged/untagged port map (name + comment + type); L3 VLAN
  interface list.
- **Out:** writing/changing VLAN config, VLAN auto-discovery, persisting VLANs to DB,
  tying VLANs to `SwitchConnection`, RBAC changes beyond `authenticate`/`requireAdmin`.

## Backend tasks (ordered)

### 1. Validator — `backend/src/validators/routeros/routeros.vlan.validator.ts`
- `deviceIdParamSchema = z.object({ deviceId: z.string().uuid('Invalid device ID format') })`.
- (No body needed; read-only GET.)

### 2. Service — `backend/src/services/routeros/routeros.global.vlan.service.ts`
Use `resolveDevice` + `assertDeviceActive`; class `RouterOSGlobalVlanService`, singleton
`routerOSGlobalVlanService`.

Types (raw → parsed):
- Raw: `RouterOSBridgeVlanRow { '.id', 'vlan-ids', 'current-tagged'?, 'current-untagged'?, bridge?, disabled?, dynamic? }`,
  `RouterOSVlanInterfaceRow { '.id', name, 'vlan-id', interface?, disabled?, dynamic? }`,
  `RouterOSInterfaceRow { name, type?, comment?, running?, disabled? }`.
- Parsed: `ParsedVlanPort { name, comment?, type?, tagged: boolean }`,
  `MergedVlan { vlanId: number, source: 'bridge' | 'interface' | 'both', bridge?: string,
  disabled: boolean, dynamic: boolean, ports: ParsedVlanPort[] }`,
  `VlanReport { deviceId, deviceType, fetchedAt, interfaceMap, bridgeVlanRows,
  vlanInterfaces, vlans: MergedVlan[] }`.

Methods:
- `private async withClient<T>(deviceId, fn)` — resolve + assert active + connect + `finally disconnect`.
- `private parseVlanIds(spec: string): number[]` — split on `,`, expand ranges `a-b`. Guards
  against non-numeric/empty tokens.
- `private splitPorts(value?: string): string[]` — split on whitespace, drop empties.
- `private buildInterfaceMap(rows): Map<string, {type, comment, running, disabled}>`.
- `private annotatePorts(names, ifaceMap, tagged): ParsedVlanPort[]` — for each name set
  `tagged`, look up comment/type; if not found, still emit the raw name (do not drop).
- `async getVlanReport(deviceId): Promise<VlanReport>`:
  1. `withClient` → run the three prints (parallel via `Promise.all`):
     `/interface/bridge/vlan/print`, `/interface/vlan/print`, `/interface/print`.
     If bridge VLAN fails (device has no bridge), continue with empty list rather than throw.
  2. Build interface map.
  3. Build `bridgeVlanRows` (each with annotated `current-tagged` → ports tagged, and
     `current-untagged` → ports untagged; expand `vlan-ids`).
  4. Build `vlanInterfaces`.
  5. Build `vlans`: key by `vlanId`; merge sources; a VLAN present in both bridge and
     `/interface vlan` → `source: 'both'`. Ports = union (dedupe name; a name is tagged if it
     appears tagged anywhere for that VLAN, else untagged).
  6. Sort `vlans` ascending by `vlanId`.

Error handling: propagate `resolveDevice`/`assertDeviceActive` errors; wrap API failures in a
clear message (`Failed to fetch VLANs from <device>: <error>`), matching the BGP service style.

### 3. Controller — `backend/src/controllers/routeros/routeros.global.vlan.controller.ts`
- `export async function getVlans(req, res, next)` → parse `deviceIdParamSchema`, call service,
  `res.json({ status: 'success', data })`, `next(error)` on failure.

### 4. Routes — `backend/src/routes/routeros/routeros.global.vlan.routes.ts`
- `router.use(authenticate); router.use(requireAdmin);`
- `GET /:deviceId` → `getVlans`.

### 5. Mount — `backend/src/routes/index.ts`
- `import routerosVlanRoutes from './routeros/routeros.global.vlan.routes';`
- `router.use('/routeros/vlan', routerosVlanRoutes);`
- Final path: `GET /api/routeros/vlan/:deviceId`.

## Frontend tasks (ordered)

### 6. Store — `frontend/app/stores/routeros/vlan.ts`
- Mirror `stores/routeros/troubleshoot.ts` state/action/getter shape.
- Interfaces matching the backend `VlanReport`/`MergedVlan`/`ParsedVlanPort` (camelCase).
- State: `report: VlanReport | null`, `isLoading`, `error`.
- Action `fetchVlans(deviceId)` → `$apiFetch('/routeros/vlan/{deviceId}')`, set `report`,
  return `{ success, data }`, catch sets `error` from `error?.data?.message`.
- Getters: `vlanCount`, `uniqueVlanIds`, `totalTaggedPorts`, `totalUntaggedPorts`.
- `clearError()` / `clearAll()`.

### 7. Page — `frontend/app/pages/routeros/vlan.vue`
Mirror `troubleshoot_ping.vue` structure:
- Header card: title "VLAN Availability", icon `i-lucide-network` / `Network`.
- Device Selection card: `useRouterosDevices()` (`fetchDevices` on mount, `Select` of devices
  with router/switch icon), badge for `status`. A "Load VLANs" / "Refresh" button calls
  `store.fetchVlans(selectedDeviceId)`; disabled until a device is picked or while loading.
- Summary stats: total VLANs, tagged ports, untagged ports, L3 VLAN interfaces count.
- **Primary table — Merged VLANs:** columns `VLAN ID`, `Source` (badge: bridge / interface /
  both), `Tagged Ports`, `Untagged Ports`, `Status` (disabled/dynamic).
  Port chips render `name` + comment (e.g. badge `sfp-sfpplus2` with muted text
  `Nexus CCR 2116`); ports with no comment show name only.
- **Secondary table — L3 VLAN Interfaces:** `Name`, `VLAN ID`, `Parent Interface`,
  `Disabled`.
- Empty state + loading spinner + error `Alert` (dismiss → `clearError`).
- Toasts: success `VLANs loaded`, error on failure.

### 8. Menu — `frontend/app/constants/menus.ts`
Add under the "Router Management" children (after Backup):
`{ title: 'VLAN', icon: 'i-lucide-layers', link: '/routeros/vlan' }`.

## Failure modes to handle

- **Device not ACTIVE** → existing guard message.
- **Device has no bridge / no VLANs** → return empty `vlans` array + empty tables; do not error.
- **`/interface/bridge/vlan/print` unsupported on the model** → treat as empty bridge rows,
  keep `/interface vlan` results.
- **`vlan-ids` range spec** (`1-10`, `100,200`) → expand correctly; skip malformed tokens.
- **Port name not found in `/interface print`** → still list the port with name only (never drop).
- **`current-tagged`/`current-untagged` returned as `"name | comment"`** → strip an optional
  ` | comment` suffix before lookup, so both API shapes work.
- **Slow device** → single connect, three prints, one disconnect via `withClient`.

## Validation plan

1. Backend build: `cd backend; npm run build` (tsc) passes.
2. `GET /api/routeros/vlan/:deviceId` with a **Switch** id returns bridge VLAN rows and a
   merged list whose port comments match the terminal's `| Nexus CCR 2116` style.
3. Same endpoint with a **Router** id works (device-agnostic).
4. Device with only `/interface vlan` (no bridge VLANs) → returns L3 VLAN interfaces, empty
   bridge section, no error.
5. Random uuid → `Device not found`; non-ACTIVE device → not-active error.
6. Frontend: `cd frontend; npm run lint` passes; page loads devices and renders both tables;
   port chips show comment when present.

## Risks / gotchas

- RouterOS field names for the VLAN table vary by version (`vlan-ids` vs `vlan_id`, hyphen
  vs underscore). Read defensively: accept both key spellings in the parser.
- `current-tagged`/`current-untagged` may be absent on older/no-bridge devices — always
  optional-chain.
- Keep the response read-only and admin-gated to match every other RouterOS route.
- Do not add a DB model; this feature is live-only by user decision.

## Verification checklist
- [ ] `backend/src/services/routeros/routeros.global.vlan.service.ts` present, uses `resolveDevice`.
- [ ] `GET /api/routeros/vlan/:deviceId` mounted and admin-gated.
- [ ] `cd backend; npm run build` passes.
- [ ] `/routeros/vlan` page renders device picker + merged VLAN table + port comments.
- [ ] Menu entry "VLAN" appears under Router Management.
- [ ] `cd frontend; npm run lint` passes.
