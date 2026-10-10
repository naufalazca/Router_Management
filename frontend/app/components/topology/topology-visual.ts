// Single source of truth for topology visual encoding.
// Colors are OKLCH tokens that adapt to light/dark via CSS variables defined in
// tailwind.css (@theme inline maps --color-* to these variables). Every entry
// pairs a light and a dark value so contrast can be validated per theme.

export type LinkType = 'ETHERNET' | 'FIBER' | 'WIRELESS' | 'VPN'
export type LinkStatus = 'ACTIVE' | 'INACTIVE' | 'PLANNED'
export type NodeKind = 'ROUTER' | 'SWITCH'
export type RouterKind = 'UPSTREAM' | 'CORE' | 'DISTRIBUSI' | 'WIRELESS'

export interface VisualToken {
  /** stroke / fill color for the light theme */
  light: string
  /** stroke / fill color for the dark theme */
  dark: string
  /** human readable label */
  label: string
  /** one-line plain-language description for the reading guide */
  description: string
}

// ---------- Link type (color channel) ----------

export const linkTypeVisual: Record<LinkType, VisualToken> = {
  ETHERNET: {
    light: 'oklch(0.705 0.213 162)',
    dark: 'oklch(0.765 0.177 163)',
    label: 'Ethernet',
    description: 'Copper cable between two nearby devices, like a normal LAN wire.',
  },
  FIBER: {
    light: 'oklch(0.623 0.188 259.8)',
    dark: 'oklch(0.746 0.16 232.7)',
    label: 'Fiber Optic',
    description: 'Long-distance fiber cable, usually between buildings or sites.',
  },
  WIRELESS: {
    light: 'oklch(0.705 0.213 47.6)',
    dark: 'oklch(0.79 0.15 62)',
    label: 'Wireless',
    description: 'Radio link (Wi-Fi or point-to-point wireless), no physical cable.',
  },
  VPN: {
    light: 'oklch(0.606 0.25 292.7)',
    dark: 'oklch(0.71 0.2 293)',
    label: 'VPN Tunnel',
    description: 'Encrypted tunnel over the internet connecting two networks securely.',
  },
}

export const fallbackLinkTypeVisual: VisualToken = {
  light: 'oklch(0.554 0.041 257)',
  dark: 'oklch(0.723 0.014 261)',
  label: 'Link',
  description: 'Standard network link.',
}

export function getLinkTypeVisual(edge: { linkType?: string, edgeType?: string }): VisualToken {
  return linkTypeVisual[edge.linkType as LinkType] ?? fallbackLinkTypeVisual
}

// ---------- Link status (pattern + motion + opacity channel) ----------

export interface StatusToken {
  /** human readable label */
  label: string
  /** one-line plain-language description for the reading guide */
  description: string
  strokeDasharray?: string
  strokeWidth: number
  opacity: number
  animated: boolean
}

export const linkStatusVisual: Record<LinkStatus, StatusToken> = {
  ACTIVE: {
    label: 'Active',
    description: 'The link is up and carrying traffic right now. Solid line with moving flow.',
    strokeDasharray: undefined,
    strokeWidth: 2.5,
    opacity: 1,
    animated: true,
  },
  PLANNED: {
    label: 'Planned',
    description: 'A future link that is designed but not installed yet. Dashed, faded line.',
    strokeDasharray: '6 6',
    strokeWidth: 2,
    opacity: 0.65,
    animated: false,
  },
  INACTIVE: {
    label: 'Inactive',
    description: 'A link that should be working but is down. Dotted, dim line.',
    strokeDasharray: '2 4',
    strokeWidth: 2,
    opacity: 0.45,
    animated: false,
  },
}

// Color overrides per status when the status itself must stand out
// (INACTIVE is danger-tinted per plan; PLANNED uses muted slate)
export const linkStatusTint: Record<Exclude<LinkStatus, 'ACTIVE'>, { light: string, dark: string }> = {
  PLANNED: {
    light: 'oklch(0.554 0.041 257)',
    dark: 'oklch(0.723 0.014 261)',
  },
  INACTIVE: {
    light: 'oklch(0.637 0.237 25.3)',
    dark: 'oklch(0.704 0.191 22.2)',
  },
}

/** Resolves the stroke color for an edge honoring the status tint for non-ACTIVE links. */
export function getEdgeStroke(edge: { linkType?: string, linkStatus?: string }, dark: boolean): string {
  if (edge.linkStatus === 'INACTIVE')
    return dark ? linkStatusTint.INACTIVE.dark : linkStatusTint.INACTIVE.light
  if (edge.linkStatus === 'PLANNED')
    return dark ? linkStatusTint.PLANNED.dark : linkStatusTint.PLANNED.light
  return dark
    ? getLinkTypeVisual(edge).dark
    : getLinkTypeVisual(edge).light
}

// ---------- Switch link accent (teal layered on top of type color) ----------

export const switchLinkAccent = {
  light: 'oklch(0.704 0.14 182.5)',
  dark: 'oklch(0.78 0.13 181.9)',
  label: 'Switch Link',
  description: 'Connection that goes through a network switch port.',
}

// ---------- Node type (color channel) ----------

export interface NodeVisualToken extends VisualToken {
  /** icon name for @nuxt/icon (lucide) */
  icon: string
}

export const nodeTypeVisual: Record<RouterKind, NodeVisualToken> = {
  UPSTREAM: {
    light: 'oklch(0.623 0.188 259.8)',
    dark: 'oklch(0.746 0.16 232.7)',
    label: 'Upstream',
    description: 'The gateway to the internet or a larger network above yours.',
    icon: 'lucide:arrow-up-to-line',
  },
  CORE: {
    light: 'oklch(0.705 0.213 162)',
    dark: 'oklch(0.765 0.177 163)',
    label: 'Core',
    description: 'The main backbone router everything connects through.',
    icon: 'lucide:cpu',
  },
  DISTRIBUSI: {
    light: 'oklch(0.606 0.25 292.7)',
    dark: 'oklch(0.71 0.2 293)',
    label: 'Distribution',
    description: 'Hands out the connection to different areas or floors.',
    icon: 'lucide:network',
  },
  WIRELESS: {
    light: 'oklch(0.705 0.213 47.6)',
    dark: 'oklch(0.79 0.15 62)',
    label: 'Wireless',
    description: 'Serves the network over radio instead of cables.',
    icon: 'lucide:wifi',
  },
}

export const fallbackNodeTypeVisual: NodeVisualToken = {
  light: 'oklch(0.554 0.041 257)',
  dark: 'oklch(0.723 0.014 261)',
  label: 'Router',
  description: 'A standard router in the network.',
  icon: 'lucide:router',
}

export const switchNodeVisual: NodeVisualToken = {
  light: 'oklch(0.704 0.14 182.5)',
  dark: 'oklch(0.78 0.13 181.9)',
  label: 'Switch',
  description: 'A switch that connects many devices on the local network.',
  icon: 'lucide:hard-drive',
}

export function getNodeVisual(node: { nodeType?: string, routerType?: string }): NodeVisualToken {
  if (node.nodeType === 'SWITCH')
    return switchNodeVisual
  return nodeTypeVisual[node.routerType as RouterKind] ?? fallbackNodeTypeVisual
}

// ---------- Node status (ring/badge channel; never recolors the card) ----------

export const nodeStatusVisual: Record<'ACTIVE' | 'INACTIVE' | 'MAINTENANCE', VisualToken> = {
  ACTIVE: {
    light: 'oklch(0.705 0.213 162)',
    dark: 'oklch(0.765 0.177 163)',
    label: 'Active',
    description: 'The device is online and healthy.',
  },
  INACTIVE: {
    light: 'oklch(0.637 0.237 25.3)',
    dark: 'oklch(0.704 0.191 22.2)',
    label: 'Inactive',
    description: 'The device is offline or unreachable.',
  },
  MAINTENANCE: {
    light: 'oklch(0.795 0.157 86.6)',
    dark: 'oklch(0.828 0.137 84.4)',
    label: 'Maintenance',
    description: 'The device is up but under maintenance.',
  },
}

export function getNodeStatusVisual(status: string): VisualToken {
  return nodeStatusVisual[status as keyof typeof nodeStatusVisual] ?? nodeStatusVisual.ACTIVE
}

/** Status badge classes for node status, using theme tokens only (work in light + dark). */
export function nodeStatusBadgeClass(status: string): string {
  switch (status) {
    case 'INACTIVE':
      return 'bg-destructive/15 text-destructive border-destructive/30'
    case 'MAINTENANCE':
      return 'bg-warning/15 text-warning-foreground border-warning/40 dark:text-warning'
    default:
      return 'bg-primary/10 text-primary border-primary/25'
  }
}

/** Status badge classes for LINK status, using theme tokens only (work in light + dark). */
export function linkStatusBadgeClass(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return 'bg-primary/10 text-primary border-primary/25'
    case 'INACTIVE':
      return 'bg-destructive/15 text-destructive border-destructive/30'
    default:
      // PLANNED: muted, matching the dashed slate edge rendering
      return 'bg-muted text-muted-foreground border-border'
  }
}

/** Status dot background class for LINK status (legend, connection lists). */
export function linkStatusDotClass(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return 'bg-primary'
    case 'INACTIVE':
      return 'bg-destructive'
    default:
      return 'bg-muted-foreground'
  }
}

// ---------- Shared CSS for the flow animation (injected once from TopologyView) ----------

export const topologyFlowCss = `
@keyframes topology-flow {
  to { stroke-dashoffset: -24; }
}

.topology-edge-flow {
  stroke-dasharray: 10 14;
  animation: topology-flow 1.1s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  .topology-edge-flow {
    animation: none;
  }
}
`
