<script setup lang="ts">
import type { Ref } from 'vue'
import { useDark } from '@vueuse/core'
import { computed, inject, ref } from 'vue'
import { getEdgeStroke, getLinkTypeVisual } from './topology-visual'

const props = defineProps<{
  id: string
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  sourcePosition: string
  targetPosition: string
  data?: Record<string, unknown>
  markerEnd?: string
}>()

const isDark = useDark()

const edge = computed(() => (props.data ?? {}) as {
  linkType?: string
  linkStatus?: string
  bandwidth?: string
  edgeType?: string
})

const stroke = computed(() => getEdgeStroke(edge.value, isDark.value))
const typeVisual = computed(() => getLinkTypeVisual(edge.value))

const isSwitchEdge = computed(() => edge.value.edgeType === 'SWITCH')

const path = computed(() => {
  // Simple cubic bezier with horizontal control offsets
  const dx = Math.abs(props.targetX - props.sourceX)
  const curvature = Math.min(0.5, Math.max(0.2, dx / 400))
  const cx1 = props.sourceX + (props.targetX - props.sourceX) * curvature
  const cy1 = props.sourceY
  const cx2 = props.targetX - (props.targetX - props.sourceX) * curvature
  const cy2 = props.targetY
  return `M ${props.sourceX},${props.sourceY} C ${cx1},${cy1} ${cx2},${cy2} ${props.targetX},${props.targetY}`
})

const status = computed(() => edge.value.linkStatus)
const opacity = computed(() => {
  if (status.value === 'INACTIVE')
    return 0.45
  if (status.value === 'PLANNED')
    return 0.65
  return 1
})

const dasharray = computed(() => {
  if (status.value === 'PLANNED')
    return '6 6'
  if (status.value === 'INACTIVE')
    return '2 4'
  return undefined
})

const strokeWidth = computed(() => {
  if (status.value === 'ACTIVE')
    return 2.5
  return 2
})

const animated = computed(() => status.value === 'ACTIVE')

// Pill label: linkType + bandwidth; hidden below a zoom threshold via a single
// hoisted flag provided by TopologyView (avoids per-edge viewport subscriptions).
// Falls back to a sensible default when rendered outside the provider.
const showLabel = inject<Ref<boolean> | undefined>('topologyShowEdgeLabels', undefined) ?? ref(true)

const label = computed(() => {
  const parts = [typeVisual.value.label]
  if (edge.value.bandwidth)
    parts.push(edge.value.bandwidth)
  return parts.join(' · ')
})

const hoverTitle = computed(() => {
  const parts = [typeVisual.value.label]
  if (edge.value.bandwidth)
    parts.push(edge.value.bandwidth)
  if (isSwitchEdge.value)
    parts.push('switch link')
  return `${parts.join(' · ')} (${status.value?.toLowerCase() ?? 'planned'})`
})

const hovered = ref(false)
</script>

<template>
  <g
    class="topology-edge"
    :opacity="opacity"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
  >
    <!-- Widened invisible hit path for easier clicking -->
    <path
      :d="path"
      fill="none"
      stroke="transparent"
      stroke-width="16"
      class="cursor-pointer"
    >
      <title>{{ hoverTitle }}</title>
    </path>

    <!-- Visible stroke -->
    <path
      :d="path"
      fill="none"
      :stroke="stroke"
      :stroke-width="hovered ? strokeWidth + 1 : strokeWidth"
      :stroke-dasharray="dasharray"
      :marker-end="markerEnd"
      class="topology-edge-stroke transition-[stroke-width] duration-200"
      :class="{ 'topology-edge-flow': animated && !hovered }"
    />

    <!-- Brighter emphasis stroke on hover/focus (same path, no endpoint movement) -->
    <path
      v-if="hovered"
      :d="path"
      fill="none"
      :stroke="stroke"
      stroke-width="1"
      opacity="0.5"
      :stroke-dasharray="dasharray"
      :marker-end="markerEnd"
      pointer-events="none"
    />

    <!-- Switch-link accent: small teal ring marker on the midpoint -->
    <circle
      v-if="isSwitchEdge && showLabel"
      :cx="(sourceX + targetX) / 2"
      :cy="(sourceY + targetY) / 2"
      r="3"
      fill="var(--color-teal-500, oklch(0.704 0.14 182.5))"
      pointer-events="none"
    />

    <!-- Glass pill label -->
    <foreignObject
      v-if="showLabel"
      :x="(sourceX + targetX) / 2 - 44"
      :y="(sourceY + targetY) / 2 - 11"
      width="88"
      height="22"
      pointer-events="none"
    >
      <div
        xmlns="http://www.w3.org/1999/xhtml"
        class="flex h-[22px] items-center justify-center rounded-full border border-border/60 bg-card/80 px-2 text-[10px] font-medium whitespace-nowrap text-foreground shadow-sm backdrop-blur-md"
      >
        <span class="truncate">{{ label }}</span>
      </div>
    </foreignObject>
  </g>
</template>
