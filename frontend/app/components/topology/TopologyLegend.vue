<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  fallbackNodeTypeVisual,
  linkStatusVisual,
  linkTypeVisual,
  nodeStatusVisual,
  nodeTypeVisual,
  switchLinkAccent,
  switchNodeVisual,
} from './topology-visual'

const props = defineProps<{
  class?: string
}>()

const isGuideOpen = ref(false)
const isCollapsed = ref(false)

// legend entries derived from the single source of truth
const nodeTypeEntries = computed(() =>
  Object.values(nodeTypeVisual).map(v => ({ label: v.label, description: v.description, color: v.light, icon: v.icon })),
)
const nodeKindEntries = computed(() => [
  { label: switchNodeVisual.label, description: switchNodeVisual.description, color: switchNodeVisual.light, icon: switchNodeVisual.icon },
  { label: fallbackNodeTypeVisual.label, description: fallbackNodeTypeVisual.description, color: fallbackNodeTypeVisual.light, icon: fallbackNodeTypeVisual.icon },
])
const linkTypeEntries = computed(() =>
  Object.values(linkTypeVisual).map(v => ({ label: v.label, description: v.description, color: v.light })),
)
const linkStatusEntries = computed(() =>
  Object.values(linkStatusVisual).map(v => ({
    label: v.label,
    description: v.description,
    dasharray: v.strokeDasharray,
    animated: v.animated,
    opacity: v.opacity,
  })),
)
const statusDotEntries = computed(() =>
  Object.values(nodeStatusVisual).map(v => ({ label: v.label, description: v.description, color: v.light })),
)
const switchAccent = computed(() => ({ label: switchLinkAccent.label, description: switchLinkAccent.description, color: switchLinkAccent.light }))
</script>

<template>
  <div :class="props.class">
    <!-- Collapsed state: reopen button -->
    <button
      v-if="isCollapsed"
      class="flex cursor-pointer items-center gap-1.5 rounded-full border border-border/60 bg-card/80 px-3 py-1.5 text-xs text-muted-foreground shadow-md backdrop-blur-md transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-expanded="false"
      aria-label="Show legend"
      @click="isCollapsed = false"
    >
      <Icon name="lucide:list" class="size-3.5" aria-hidden="true" />
      Legend
    </button>

    <div
      v-else
      class="w-64 rounded-xl border border-border/60 bg-card/80 shadow-lg backdrop-blur-md"
      role="region"
      aria-label="Topology legend"
    >
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-border/60 px-3 py-2">
        <p class="text-xs font-semibold">
          Legend
        </p>
        <div class="flex items-center gap-0.5">
          <button
            class="cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            :aria-expanded="isGuideOpen"
            :aria-label="isGuideOpen ? 'Hide reading guide' : 'How to read this map'"
            @click="isGuideOpen = !isGuideOpen"
          >
            <Icon :name="isGuideOpen ? 'lucide:book-open' : 'lucide:book'" class="size-3.5" aria-hidden="true" />
          </button>
          <button
            class="cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Collapse legend"
            @click="isCollapsed = true"
          >
            <Icon name="lucide:chevron-down" class="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <!-- Reading guide -->
      <div
        v-if="isGuideOpen"
        class="max-h-48 overflow-y-auto border-b border-border/60 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground"
      >
        <p class="mb-1.5 font-medium text-foreground">
          How to read this map
        </p>
        <p class="mb-1">
          Lines are <span class="text-foreground">connections</span>. The
          <span class="text-foreground">color</span> tells you what kind of link it is,
          the <span class="text-foreground">pattern</span> tells you whether it works,
          and the <span class="text-foreground">moving flow</span> means traffic is passing through.
        </p>
        <p class="mb-1">
          Circles are <span class="text-foreground">devices</span>. Click any line or circle
          for full details. Drag a device to rearrange; drag from its side dot to connect.
        </p>
        <div class="space-y-0.5">
          <p v-for="e in linkStatusEntries" :key="e.label">
            <span class="font-medium text-foreground">{{ e.label }}:</span> {{ e.description }}
          </p>
        </div>
      </div>

      <!-- Sections -->
      <div class="max-h-72 space-y-3 overflow-y-auto px-3 py-2.5">
        <section aria-label="Device types">
          <p class="mb-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
            Device types
          </p>
          <ul class="space-y-1">
            <li
              v-for="e in [...nodeTypeEntries, ...nodeKindEntries]"
              :key="e.label"
              class="flex items-center gap-2 text-[11px]"
            >
              <span
                aria-hidden="true"
                class="flex size-5 shrink-0 items-center justify-center rounded"
                :style="{ backgroundColor: `color-mix(in oklch, ${e.color} 18%, transparent)`, color: e.color }"
              >
                <Icon :name="e.icon" class="size-3" />
              </span>
              <span class="truncate">{{ e.label }}</span>
            </li>
          </ul>
          <ul class="mt-1 space-y-1">
            <li
              v-for="e in statusDotEntries"
              :key="`dot-${e.label}`"
              class="flex items-center gap-2 text-[11px] text-muted-foreground"
            >
              <span
                aria-hidden="true"
                class="size-2 shrink-0 rounded-full"
                :style="{ backgroundColor: e.color }"
              />
              <span>{{ e.label }} (status dot)</span>
            </li>
          </ul>
        </section>

        <section aria-label="Connection types">
          <p class="mb-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
            Connection types
          </p>
          <ul class="space-y-1">
            <li v-for="e in linkTypeEntries" :key="e.label" class="flex items-center gap-2 text-[11px]">
              <svg aria-hidden="true" width="26" height="6" class="shrink-0">
                <line x1="0" y1="3" x2="26" y2="3" :stroke="e.color" stroke-width="2.5" stroke-linecap="round" />
              </svg>
              <span>{{ e.label }}</span>
            </li>
            <li class="flex items-center gap-2 text-[11px]">
              <svg aria-hidden="true" width="26" height="6" class="shrink-0">
                <line
                  x1="0" y1="3" x2="26" y2="3"
                  :stroke="switchAccent.color" stroke-width="2.5" stroke-linecap="round"
                />
                <circle :cx="13" cy="3" r="2.5" :fill="switchAccent.color" stroke="var(--color-card)" stroke-width="1" />
              </svg>
              <span>{{ switchAccent.label }}</span>
            </li>
          </ul>
        </section>

        <section aria-label="Connection status">
          <p class="mb-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
            Connection status
          </p>
          <ul class="space-y-1">
            <li
              v-for="e in linkStatusEntries"
              :key="e.label"
              class="flex items-center gap-2 text-[11px]"
            >
              <svg aria-hidden="true" width="26" height="6" class="shrink-0">
                <line
                  x1="0" y1="3" x2="26" y2="3"
                  stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
                  :stroke-dasharray="e.dasharray"
                  :class="{ 'topology-edge-flow': e.animated }"
                  :style="{ opacity: e.opacity }"
                />
              </svg>
              <span>{{ e.label }}</span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  </div>
</template>
