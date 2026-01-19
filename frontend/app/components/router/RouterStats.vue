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
  <div class="stats-grid">
    <Card class="stat-card">
      <CardContent class="pt-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-mono text-muted-foreground uppercase tracking-wider">Total</p>
            <p class="text-3xl font-bold tabular-nums mt-1">{{ total }}</p>
          </div>
          <Server class="h-8 w-8 text-muted-foreground opacity-50" />
        </div>
      </CardContent>
    </Card>

    <Card class="stat-card stat-active">
      <CardContent class="pt-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-mono text-emerald-400 uppercase tracking-wider">Online</p>
            <p class="text-3xl font-bold tabular-nums mt-1 text-emerald-400">{{ active }}</p>
          </div>
          <Activity class="h-8 w-8 text-emerald-400 animate-pulse-slow" />
        </div>
      </CardContent>
    </Card>

    <Card class="stat-card">
      <CardContent class="pt-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-mono text-slate-400 uppercase tracking-wider">Offline</p>
            <p class="text-3xl font-bold tabular-nums mt-1 text-slate-400">{{ inactive }}</p>
          </div>
          <XCircle class="h-8 w-8 text-slate-400 opacity-50" />
        </div>
      </CardContent>
    </Card>

    <Card class="stat-card">
      <CardContent class="pt-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-mono text-amber-400 uppercase tracking-wider">Maintenance</p>
            <p class="text-3xl font-bold tabular-nums mt-1 text-amber-400">{{ maintenance }}</p>
          </div>
          <Wrench class="h-8 w-8 text-amber-400 opacity-50" />
        </div>
      </CardContent>
    </Card>
  </div>
</template>

<style scoped>
/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.stat-card {
  position: relative;
  border: 1px solid hsl(var(--border) / 0.5);
  background: linear-gradient(135deg, hsl(var(--card)), hsl(var(--muted) / 0.1));
  transition: all 0.3s;
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, hsl(var(--primary) / 0.3), transparent);
}

.stat-active::before {
  background: linear-gradient(90deg, transparent, rgb(52 211 153 / 0.5), transparent);
}

.stat-card:hover {
  border-color: hsl(var(--primary) / 0.3);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px -2px hsl(var(--foreground) / 0.1);
}

@keyframes pulse-slow {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.animate-pulse-slow {
  animation: pulse-slow 2s ease-in-out infinite;
}

/* Responsive */
@media (max-width: 640px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
