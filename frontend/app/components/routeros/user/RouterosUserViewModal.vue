<script setup lang="ts">
import { type RouterOSUser } from '~/stores/routeros/user'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  User,
  Key,
  Shield,
  MapPin,
  FileText,
  Clock,
  CheckCircle2,
  XCircle
} from 'lucide-vue-next'

const props = defineProps<{
  open: boolean
  user: RouterOSUser | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

function formatDate(date: Date | undefined) {
  if (!date) return 'Never'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}
</script>

<template>
  <Dialog :open="props.open" @update:open="(val) => emit('update:open', val)">
    <DialogContent class="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle class="font-mono">RouterOS User Details</DialogTitle>
        <DialogDescription class="font-mono text-xs">
          View user account information
        </DialogDescription>
      </DialogHeader>

      <div v-if="props.user" class="space-y-6 mt-4">
        <!-- User Information Card -->
        <Card>
          <CardHeader>
            <div class="flex items-center justify-between">
              <CardTitle class="font-mono text-lg flex items-center gap-2">
                <User class="h-5 w-5" />
                User Information
              </CardTitle>
              <Badge
                :class="!props.user.disabled ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-slate-500/10 border-slate-500/20'"
                class="status-badge font-mono text-xs gap-1.5"
              >
                <component
                  :is="!props.user.disabled ? CheckCircle2 : XCircle"
                  :class="!props.user.disabled ? 'text-emerald-400' : 'text-slate-400'"
                  class="h-3 w-3"
                />
                {{ props.user.disabled ? 'DISABLED' : 'ENABLED' }}
              </Badge>
            </div>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <!-- Username -->
              <div class="space-y-1">
                <div class="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase">
                  <User class="h-3 w-3" />
                  Username
                </div>
                <p class="font-mono text-sm font-medium">{{ props.user.name }}</p>
              </div>

              <!-- User ID -->
              <div class="space-y-1">
                <div class="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase">
                  <Key class="h-3 w-3" />
                  User ID
                </div>
                <p class="font-mono text-sm text-cyan-400">{{ props.user.id }}</p>
              </div>

              <!-- Group -->
              <div class="space-y-1">
                <div class="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase">
                  <Shield class="h-3 w-3" />
                  Group
                </div>
                <Badge class="font-mono">
                  {{ props.user.group }}
                </Badge>
              </div>

              <!-- IP Address -->
              <div class="space-y-1">
                <div class="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase">
                  <MapPin class="h-3 w-3" />
                  Allowed IP Address
                </div>
                <p class="font-mono text-sm">{{ props.user.address || '0.0.0.0/0 (Any)' }}</p>
              </div>

              <!-- Last Login -->
              <div class="col-span-2 space-y-1">
                <div class="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase">
                  <Clock class="h-3 w-3" />
                  Last Logged In
                </div>
                <p class="font-mono text-sm text-muted-foreground">{{ formatDate(props.user.lastLoggedIn) }}</p>
              </div>

              <!-- Comment -->
              <div v-if="props.user.comment" class="col-span-2 space-y-1">
                <div class="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase">
                  <FileText class="h-3 w-3" />
                  Comment
                </div>
                <p class="font-mono text-sm text-muted-foreground">{{ props.user.comment }}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Security Information Card -->
        <Card>
          <CardHeader>
            <CardTitle class="font-mono text-lg flex items-center gap-2">
              <Shield class="h-5 w-5" />
              Security Information
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <!-- Password -->
              <div class="space-y-1">
                <div class="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase">
                  <Key class="h-3 w-3" />
                  Password
                </div>
                <p class="font-mono text-sm text-muted-foreground">••••••••••••</p>
              </div>

              <!-- Status -->
              <div class="space-y-1">
                <div class="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase">
                  Status
                </div>
                <p class="font-mono text-sm font-medium" :class="!props.user.disabled ? 'text-emerald-400' : 'text-slate-400'">
                  {{ props.user.disabled ? 'Account Disabled' : 'Account Active' }}
                </p>
              </div>
            </div>

            <div v-if="props.user.disabled" class="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
              <div class="flex gap-3">
                <XCircle class="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div class="space-y-1">
                  <p class="font-mono text-sm font-medium text-amber-400">
                    User Account Disabled
                  </p>
                  <p class="font-mono text-xs text-muted-foreground">
                    This user cannot login to the router until the account is enabled.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Permission Information -->
        <Card>
          <CardHeader>
            <CardTitle class="font-mono text-lg flex items-center gap-2">
              <Shield class="h-5 w-5" />
              Permissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div class="space-y-2">
              <div class="rounded-lg border border-border/50 bg-muted/30 p-3">
                <p class="font-mono text-xs text-muted-foreground">
                  <span class="font-medium text-foreground">Group:</span> {{ props.user.group }}
                </p>
                <p class="font-mono text-xs text-muted-foreground mt-1">
                  {{
                    props.user.group === 'full'
                      ? 'Full administrative access to all router features'
                      : props.user.group === 'read'
                      ? 'Read-only access to router configuration'
                      : 'Read and write access to router configuration'
                  }}
                </p>
              </div>
              <div class="rounded-lg border border-border/50 bg-muted/30 p-3">
                <p class="font-mono text-xs text-muted-foreground">
                  <span class="font-medium text-foreground">IP Restriction:</span> {{ props.user.address || 'None (Any IP allowed)' }}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div class="flex justify-end pt-4 border-t">
          <Button
            variant="outline"
            @click="emit('update:open', false)"
          >
            Close
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<style scoped>
.status-badge {
  border: 1px solid;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
</style>
