<script setup lang="ts">
import type { NodeProps } from '@vue-flow/core'
import { Handle, Position } from '@vue-flow/core'
import { useDark } from '@vueuse/core'
import { computed } from 'vue'
import { getNodeStatusVisual, getNodeVisual } from './topology-visual'

const props = defineProps<NodeProps>()

// data is the raw TopologyNode object (kept verbatim for position persistence)
const node = computed(() => props.data as {
  name: string
  ipAddress: string
  nodeType: string
  routerType?: string
  status: string
  brand?: string
  portCount?: number
  companyName?: string
})

const isDark = useDark()

const visual = computed(() => getNodeVisual(node.value))
const statusVisual = computed(() => getNodeStatusVisual(node.value.status))

const typeLabel = computed(() => {
  if (node.value.nodeType === 'SWITCH')
    return 'Switch'
  return visual.value.label
})

// Accent color follows the active theme (light/dark pairs in topology-visual.ts)
const accentColor = computed(() => (isDark.value ? visual.value.dark : visual.value.light))
const statusColor = computed(() => (isDark.value ? statusVisual.value.dark : statusVisual.value.light))

const selected = computed(() => props.selected)
</script>

<template>
  <div
    class="topology-node group relative rounded-lg border bg-card/80 shadow-sm backdrop-blur-md transition-shadow duration-200"
    :class="selected ? 'ring-2 ring-ring ring-offset-2 ring-offset-background' : 'hover:shadow-md'"
    :style="{ '--node-accent': accentColor }"
    :aria-label="`${node.name} (${typeLabel})`"
  >
    <!-- Handles (large hit area styled globally in TopologyView) -->
    <Handle
      type="target"
      :position="Position.Left"
      class="topology-handle"
    />
    <Handle
      type="source"
      :position="Position.Right"
      class="topology-handle"
    />

    <div class="flex items-center gap-2.5 px-3 py-2.5">
      <!-- Icon chip tinted with the node-type accent -->
      <div
        aria-hidden="true"
        class="flex size-9 shrink-0 items-center justify-center rounded-md border"
        :style="{
          backgroundColor: 'color-mix(in oklch, var(--node-accent) 18%, transparent)',
          borderColor: 'color-mix(in oklch, var(--node-accent) 45%, transparent)',
          color: 'var(--node-accent)',
        }"
      >
        <Icon :name="visual.icon" class="size-4.5" />
      </div>

      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-semibold leading-tight">
          {{ node.name }}
        </p>
        <p class="truncate font-mono text-[11px] text-muted-foreground leading-tight">
          {{ node.ipAddress }}
        </p>
      </div>

      <!-- Status dot -->
      <span
        aria-hidden="true"
        class="size-2.5 shrink-0 rounded-full border"
        :style="{
          backgroundColor: node.status === 'ACTIVE'
            ? 'var(--node-accent)'
            : statusColor,
          borderColor: 'color-mix(in oklch, currentColor 30%, transparent)',
        }"
        :title="statusVisual.label"
      />
    </div>

    <div class="flex items-center justify-between gap-2 border-t px-3 py-1.5">
      <span
        class="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
        :style="{
          backgroundColor: 'color-mix(in oklch, var(--node-accent) 15%, transparent)',
          color: 'var(--node-accent)',
        }"
      >
        {{ typeLabel }}
      </span>
      <span
        v-if="node.nodeType === 'SWITCH' && node.portCount"
        class="text-[10px] text-muted-foreground"
      >
        {{ node.portCount }} ports
      </span>
    </div>
  </div>
</template>
