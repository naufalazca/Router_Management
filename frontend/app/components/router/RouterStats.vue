<script setup lang="ts">
import { Server, Activity, XCircle, Wrench } from 'lucide-vue-next'
import { Card, CardContent } from '@/components/ui/card'

defineProps<{
  total: number
  active: number
  inactive: number
  maintenance: number
}>()
</script>

<template>
  <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    <Card>
      <CardContent class="pt-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs text-muted-foreground uppercase tracking-wider">Total</p>
            <p class="text-3xl font-bold tabular-nums mt-1">{{ total }}</p>
          </div>
          <Server class="h-8 w-8 text-muted-foreground/50" />
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardContent class="pt-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Online</p>
            <p class="text-3xl font-bold tabular-nums mt-1 text-emerald-600 dark:text-emerald-400">{{ active }}</p>
          </div>
          <Activity class="h-8 w-8 text-emerald-600/50 dark:text-emerald-400/50 animate-pulse" />
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardContent class="pt-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs text-muted-foreground uppercase tracking-wider">Offline</p>
            <p class="text-3xl font-bold tabular-nums mt-1 text-muted-foreground">{{ inactive }}</p>
          </div>
          <XCircle class="h-8 w-8 text-muted-foreground/50" />
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardContent class="pt-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs text-amber-600 dark:text-amber-400 uppercase tracking-wider">Maintenance</p>
            <p class="text-3xl font-bold tabular-nums mt-1 text-amber-600 dark:text-amber-400">{{ maintenance }}</p>
          </div>
          <Wrench class="h-8 w-8 text-amber-600/50 dark:text-amber-400/50" />
        </div>
      </CardContent>
    </Card>
  </div>
</template>
