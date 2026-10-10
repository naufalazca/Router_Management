import type { Router } from '~/stores/router'
import type { Switch } from '~/stores/switch'
import { useRouterStore } from '~/stores/router'
import { useSwitchStore } from '~/stores/switch'

/**
 * RouterOS-capable device (Router or Switch).
 * Both share the same credential shape and are accepted by the
 * device-agnostic RouterOS endpoints (user, troubleshoot, backup).
 */
export interface RouterosDevice {
  id: string
  name: string
  ipAddress: string
  status: string
  deviceType: 'router' | 'switch'
  model?: string | null
  location?: string | null
}

/**
 * Composable providing a combined Router + Switch device list
 * for RouterOS feature pages (user, troubleshoot, backup).
 */
export function useRouterosDevices() {
  const routerStore = useRouterStore()
  const switchStore = useSwitchStore()

  const devices = computed<RouterosDevice[]>(() => [
    ...routerStore.routers.map(r => ({
      id: r.id,
      name: r.name,
      ipAddress: r.ipAddress,
      status: r.status,
      deviceType: 'router' as const,
      model: r.model ?? null,
      location: r.location ?? null,
    })),
    ...switchStore.switches.map((s: Switch) => ({
      id: s.id,
      name: s.name,
      ipAddress: s.ipAddress,
      status: s.status,
      deviceType: 'switch' as const,
      model: s.model ?? null,
      location: s.location ?? null,
    })),
  ])

  function findDevice(id: string): RouterosDevice | undefined {
    return devices.value.find(d => d.id === id)
  }

  /**
   * Fetch both router and switch lists. Errors are collected so a
   * partial failure still yields the device type that loaded.
   */
  async function fetchDevices() {
    const results = await Promise.allSettled([
      routerStore.fetchRouters(),
      switchStore.fetchSwitches(),
    ])
    const failed = results.filter(r => r.status === 'rejected')
    if (failed.length === results.length && results.length > 0) {
      throw new Error('Failed to load devices')
    }
  }

  return {
    devices,
    findDevice,
    fetchDevices,
    routers: computed(() => routerStore.routers),
    switches: computed(() => switchStore.switches),
  }
}
