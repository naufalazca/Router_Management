<script setup lang="ts">
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Archive, CheckCircle2, XCircle, Pin, HardDrive } from 'lucide-vue-next'

defineProps<{
  total: number
  completed: number
  failed: number
  pinned: number
  totalSizeMb: number
}>()
</script>

<template>
  <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
    <!-- Total Backups -->
    <Card>
      <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle class="text-sm font-medium">Total Backups</CardTitle>
        <Archive class="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div class="text-2xl font-bold">{{ total }}</div>
        <p class="text-xs text-muted-foreground mt-1">
          All backup records
        </p>
      </CardContent>
    </Card>

    <!-- Completed -->
    <Card>
      <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle class="text-sm font-medium">Completed</CardTitle>
        <CheckCircle2 class="h-4 w-4 text-green-600" />
      </CardHeader>
      <CardContent>
        <div class="text-2xl font-bold text-green-600">{{ completed }}</div>
        <p class="text-xs text-muted-foreground mt-1">
          Successfully backed up
        </p>
      </CardContent>
    </Card>

    <!-- Failed -->
    <Card>
      <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle class="text-sm font-medium">Failed</CardTitle>
        <XCircle class="h-4 w-4 text-red-600" />
      </CardHeader>
      <CardContent>
        <div class="text-2xl font-bold text-red-600">{{ failed }}</div>
        <p class="text-xs text-muted-foreground mt-1">
          Backup errors
        </p>
      </CardContent>
    </Card>

    <!-- Pinned -->
    <Card>
      <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle class="text-sm font-medium">Pinned</CardTitle>
        <Pin class="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <div class="text-2xl font-bold text-primary">{{ pinned }}</div>
        <p class="text-xs text-muted-foreground mt-1">
          Protected backups
        </p>
      </CardContent>
    </Card>

    <!-- Total Size -->
    <Card>
      <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle class="text-sm font-medium">Total Size</CardTitle>
        <HardDrive class="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div class="text-2xl font-bold">{{ totalSizeMb.toFixed(2) }} MB</div>
        <p class="text-xs text-muted-foreground mt-1">
          Storage used
        </p>
      </CardContent>
    </Card>
  </div>
</template>
