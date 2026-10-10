/**
 * RouterOS VLAN Availability Service (device-agnostic: Router + Switch)
 *
 * Read-only feature that lists the VLANs present on a RouterOS device.
 * Uses the RouterOS API client (port 8728) — all three VLAN /print commands
 * return structured data, so the API transport is the right fit.
 *
 * The three data sources are combined:
 *  - /interface/bridge/vlan/print  — bridge VLAN table (L2)
 *  - /interface/vlan/print         — L3 VLAN interfaces
 *  - /interface/print              — port name -> { type, comment, running, disabled } map
 *
 * Every port in the VLAN rows is annotated with its interface comment so the
 * UI shows the same mapping the RouterOS terminal does (e.g. "sfp-sfpplus2 | Nexus CCR 2116").
 */

import { RouterOSClient } from '../../lib/routeros/client';
import {
  assertDeviceActive,
  resolveDevice,
  type ResolvedDevice,
} from '../../lib/routeros/resolve-device';

/* ------------------------------------------------------------------ */
/* Raw RouterOS rows (hyphen/underscore spellings both accepted)       */
/* ------------------------------------------------------------------ */

export interface RouterOSBridgeVlanRow {
  '.id': string;
  'vlan-ids'?: string;
  vlan_id?: string;
  'current-tagged'?: string;
  current_tagged?: string;
  'current-untagged'?: string;
  current_untagged?: string;
  bridge?: string;
  disabled?: string;
  dynamic?: string;
  [key: string]: unknown;
}

export interface RouterOSVlanInterfaceRow {
  '.id': string;
  name?: string;
  'vlan-id'?: string;
  vlan_id?: string;
  interface?: string;
  comment?: string;
  disabled?: string;
  dynamic?: string;
  [key: string]: unknown;
}

export interface RouterOSInterfaceRow {
  '.id'?: string;
  name?: string;
  type?: string;
  comment?: string;
  running?: string;
  disabled?: string;
  [key: string]: unknown;
}

/* ------------------------------------------------------------------ */
/* Parsed types (frontend-friendly, camelCase)                         */
/* ------------------------------------------------------------------ */

export interface ParsedVlanPort {
  name: string;
  comment?: string;
  type?: string;
  tagged: boolean;
}

export interface MergedVlan {
  vlanId: number;
  source: 'bridge' | 'interface' | 'both';
  bridge?: string;
  disabled: boolean;
  dynamic: boolean;
  ports: ParsedVlanPort[];
}

export interface ParsedBridgeVlanRow {
  id: string;
  vlanIds: number[];
  bridge?: string;
  disabled: boolean;
  dynamic: boolean;
  taggedPorts: ParsedVlanPort[];
  untaggedPorts: ParsedVlanPort[];
}

export interface ParsedVlanInterface {
  id: string;
  name?: string;
  /** VLAN interface's own comment (may hold a friendly label). */
  comment?: string;
  vlanId?: number;
  parentInterface?: string;
  /** Comment of the parent interface, resolved from /interface print. */
  parentComment?: string;
  /** Type of the parent interface, resolved from /interface print. */
  parentType?: string;
  disabled: boolean;
  dynamic: boolean;
}

export interface VlanReport {
  deviceId: string;
  deviceType: string;
  deviceName: string;
  fetchedAt: string;
  interfaceMap: Record<string, { type?: string; comment?: string; running: boolean; disabled: boolean }>;
  bridgeVlanRows: ParsedBridgeVlanRow[];
  vlanInterfaces: ParsedVlanInterface[];
  vlans: MergedVlan[];
}

interface InterfaceInfo {
  type?: string;
  comment?: string;
  running: boolean;
  disabled: boolean;
}

export class RouterOSGlobalVlanService {
  /**
   * Resolve the device, enforce the ACTIVE guard, connect, run the callback,
   * and always disconnect in `finally`.
   */
  private async withClient<T>(
    deviceId: string,
    fn: (client: RouterOSClient, device: ResolvedDevice) => Promise<T>,
  ): Promise<T> {
    const device = await resolveDevice(deviceId);
    assertDeviceActive(device);

    const client = new RouterOSClient({
      host: device.ipAddress,
      port: device.apiPort,
      username: device.username,
      password: device.password,
    });

    try {
      await client.connect();
      return await fn(client, device);
    } finally {
      await client.disconnect();
    }
  }

  /**
   * Parse a `vlan-ids` spec: comma-separated, ranges `a-b` expanded.
   * Malformed tokens are skipped rather than failing the request.
   */
  private parseVlanIds(spec?: string): number[] {
    if (!spec || !spec.trim()) {
      return [];
    }

    const ids: number[] = [];
    const tokens = spec.split(',').map(t => t.trim()).filter(Boolean);

    for (const token of tokens) {
      const rangeMatch = token.match(/^(\d+)\s*-\s*(\d+)$/);
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1], 10);
        const end = parseInt(rangeMatch[2], 10);
        if (Number.isFinite(start) && Number.isFinite(end) && start <= end) {
          for (let id = start; id <= end; id++) {
            ids.push(id);
          }
        }
        continue;
      }

      // Accept any all-digit token (including leading zeros) so valid ids
      // such as "0100" are not silently dropped.
      if (/^\d+$/.test(token)) {
        ids.push(parseInt(token, 10));
      }
    }

    return ids;
  }

  /**
   * Split a RouterOS port list into individual port names.
   *
   * RouterOS joins member ports with commas and/or whitespace depending on the
   * version, e.g. "sfp-sfpplus2,sfp-sfpplus5" or "ether1 ether2". Some versions
   * append a `" | comment"` suffix to each entry, so a comma-split is only safe
   * when the comment itself contains no comma. To stay robust we split on
   * commas first, then trim each entry (the comment suffix is handled later by
   * `stripCommentSuffix`).
   */
  private splitPorts(value?: string): string[] {
    if (!value || !value.trim()) {
      return [];
    }
    return value
      .split(',')
      .map(entry => entry.trim())
      .filter(Boolean);
  }

  /**
   * Strip an optional `" | comment"` suffix that some RouterOS versions
   * append to port names, returning the bare interface name.
   */
  private stripCommentSuffix(port: string): string {
    const idx = port.indexOf(' | ');
    return idx > 0 ? port.slice(0, idx).trim() : port.trim();
  }

  /**
   * Build a name -> interface-info map from `/interface print` rows.
   */
  private buildInterfaceMap(rows: RouterOSInterfaceRow[]): Map<string, InterfaceInfo> {
    const map = new Map<string, InterfaceInfo>();
    for (const row of rows) {
      if (!row.name) {
        continue;
      }
      map.set(row.name, {
        type: row.type,
        comment: row.comment || undefined,
        running: row.running === 'true',
        disabled: row.disabled === 'true',
      });
    }
    return map;
  }

  /**
   * Annotate a list of port names with comment/type info from the interface map.
   * Ports not found in the map are still emitted with their raw name (never dropped).
   */
  private annotatePorts(names: string[], ifaceMap: Map<string, InterfaceInfo>, tagged: boolean): ParsedVlanPort[] {
    const ports: ParsedVlanPort[] = [];
    for (const rawName of names) {
      const name = this.stripCommentSuffix(rawName);
      if (!name) {
        continue;
      }
      const info = ifaceMap.get(name);
      ports.push({
        name,
        comment: info?.comment,
        type: info?.type,
        tagged,
      });
    }
    return ports;
  }

  /**
   * Fetch the full VLAN report for a device.
   */
  async getVlanReport(deviceId: string): Promise<VlanReport> {
    return this.withClient(deviceId, async (client, device) => {
      const [bridgeResult, vlanIfResult, ifaceResult] = await Promise.all([
        client.execute('/interface/bridge/vlan/print'),
        client.execute('/interface/vlan/print'),
        client.execute('/interface/print'),
      ]);

      if (!vlanIfResult.success) {
        throw new Error(`Failed to fetch VLANs from ${device.name}: ${vlanIfResult.error}`);
      }
      if (!ifaceResult.success) {
        throw new Error(`Failed to fetch interfaces from ${device.name}: ${ifaceResult.error}`);
      }

      // Bridge VLAN table is optional: a device with no bridge (or an older
      // model) fails here — treat as empty and still surface the other results.
      const bridgeRows: RouterOSBridgeVlanRow[] = bridgeResult.success
        ? ((bridgeResult.data || []) as RouterOSBridgeVlanRow[])
        : [];
      if (!bridgeResult.success) {
        console.warn(
          `Bridge VLAN table unavailable on ${device.name} (${device.deviceType} ${device.id}): ${bridgeResult.error}`,
        );
      }

      const vlanIfRows = (vlanIfResult.data || []) as RouterOSVlanInterfaceRow[];
      const ifaceRows = (ifaceResult.data || []) as RouterOSInterfaceRow[];

      // 2. Build interface map
      const ifaceMap = this.buildInterfaceMap(ifaceRows);

      // 3. Build annotated bridge VLAN rows
      const bridgeVlanRows: ParsedBridgeVlanRow[] = bridgeRows.map((row) => {
        const vlanIds = this.parseVlanIds(row['vlan-ids'] ?? row.vlan_id);
        const taggedPorts = this.annotatePorts(
          this.splitPorts(row['current-tagged'] ?? row.current_tagged),
          ifaceMap,
          true,
        );
        const untaggedPorts = this.annotatePorts(
          this.splitPorts(row['current-untagged'] ?? row.current_untagged),
          ifaceMap,
          false,
        );
        return {
          id: row['.id'],
          vlanIds,
          bridge: row.bridge,
          disabled: row.disabled === 'true',
          dynamic: row.dynamic === 'true',
          taggedPorts,
          untaggedPorts,
        };
      });

      // 4. Build L3 VLAN interfaces, resolving the parent interface's comment/type
      //    from the /interface print map so the UI can show e.g. "ether1 | Uplink".
      const vlanInterfaces: ParsedVlanInterface[] = vlanIfRows.map((row) => {
        const rawVlanId = row['vlan-id'] ?? row.vlan_id;
        const parsedVlanId = rawVlanId != null ? parseInt(String(rawVlanId), 10) : undefined;
        const parentName = row.interface ? this.stripCommentSuffix(row.interface) : undefined;
        const parentInfo = parentName ? ifaceMap.get(parentName) : undefined;
        return {
          id: row['.id'],
          name: row.name,
          comment: row.comment || undefined,
          // Reject NaN/Infinity from malformed values so they never reach the merge map.
          vlanId: parsedVlanId !== undefined && Number.isFinite(parsedVlanId) ? parsedVlanId : undefined,
          parentInterface: parentName,
          parentComment: parentInfo?.comment,
          parentType: parentInfo?.type,
          disabled: row.disabled === 'true',
          dynamic: row.dynamic === 'true',
        };
      });

      // 5. Merge into one entry per unique VLAN id
      interface MergedEntry {
        seenBridge: boolean;
        seenInterface: boolean;
        bridge?: string;
        disabled: boolean;
        dynamic: boolean;
        ports: Map<string, ParsedVlanPort>;
      }
      const merged = new Map<number, MergedEntry>();

      const upsert = (vlanId: number, fromBridge: boolean, update: (entry: MergedEntry) => void) => {
        let entry = merged.get(vlanId);
        if (!entry) {
          entry = {
            seenBridge: false,
            seenInterface: false,
            disabled: false,
            dynamic: false,
            ports: new Map(),
          };
          merged.set(vlanId, entry);
        }
        // Track the real sources independently so `source` reflects whether the
        // VLAN came from the bridge table, an L3 interface, or both.
        if (fromBridge) {
          entry.seenBridge = true;
        } else {
          entry.seenInterface = true;
        }
        update(entry);
      };

      for (const row of bridgeVlanRows) {
        for (const vlanId of row.vlanIds) {
          upsert(vlanId, true, (entry) => {
            entry.bridge = row.bridge ?? entry.bridge;
            entry.disabled = entry.disabled || row.disabled;
            entry.dynamic = entry.dynamic || row.dynamic;
            for (const port of [...row.taggedPorts, ...row.untaggedPorts]) {
              const existing = entry.ports.get(port.name);
              // A port is tagged if it appears tagged anywhere for that VLAN.
              if (!existing || (port.tagged && !existing.tagged)) {
                entry.ports.set(port.name, { ...port });
              }
            }
          });
        }
      }

      for (const vlanIf of vlanInterfaces) {
        if (!Number.isFinite(vlanIf.vlanId)) {
          continue;
        }
        upsert(vlanIf.vlanId as number, false, (entry) => {
          entry.disabled = entry.disabled || vlanIf.disabled;
          entry.dynamic = entry.dynamic || vlanIf.dynamic;
        });
      }

      // 6. Sort ascending by vlanId
      const vlans: MergedVlan[] = Array.from(merged.entries())
        .sort(([a], [b]) => a - b)
        .map(([vlanId, entry]) => ({
          vlanId,
          source: entry.seenBridge && entry.seenInterface
            ? 'both'
            : entry.seenBridge
              ? 'bridge'
              : 'interface',
          bridge: entry.bridge,
          disabled: entry.disabled,
          dynamic: entry.dynamic,
          ports: Array.from(entry.ports.values()).sort((a, b) => a.name.localeCompare(b.name)),
        }));

      const interfaceMap: Record<string, InterfaceInfo> = {};
      for (const [name, info] of ifaceMap.entries()) {
        interfaceMap[name] = info;
      }

      return {
        deviceId: device.id,
        deviceType: device.deviceType,
        deviceName: device.name,
        fetchedAt: new Date().toISOString(),
        interfaceMap,
        bridgeVlanRows,
        vlanInterfaces,
        vlans,
      };
    });
  }
}

// Export singleton instance
export const routerOSGlobalVlanService = new RouterOSGlobalVlanService();
