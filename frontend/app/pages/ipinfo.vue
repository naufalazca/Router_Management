<script setup lang="ts">
import { ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, Globe, Search } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useIPInfoStore, type IPInfoData } from '~/stores/ipinfo/ipinfo'

const ipinfoStore = useIPInfoStore()

// Watch for errors from store and show toast
watch(() => ipinfoStore.error, (newError) => {
  if (newError) {
    toast.error(newError)
  }
})

// Search input
const ipSearch = ref('')

// Format flag emoji from country code
function getFlagEmoji(countryCode: string) {
  if (!countryCode || countryCode.length !== 2)
    return ''
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0))
  return String.fromCodePoint(...codePoints)
}

// Handle IP search
async function handleIPSearch() {
  if (!ipSearch.value.trim()) {
    toast.error('Please enter an IP address')
    return
  }
  await ipinfoStore.fetchIPInfo(ipSearch.value.trim())
}

// Handle enter key
function handleIPKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter')
    handleIPSearch()
}

// Clear search
function clearIPSearch() {
  ipSearch.value = ''
  ipinfoStore.clearCurrentIPInfo()
}

// Quick lookup IPs
const quickIPs = [
  { ip: '8.8.8.8', label: 'Google DNS' },
  { ip: '1.1.1.1', label: 'Cloudflare DNS' },
  { ip: '208.67.222.222', label: 'OpenDNS' },
]
</script>

<template>
  <div class="w-full space-y-6">
    <!-- Error Alert -->
    <Alert
      v-if="ipinfoStore.error"
      variant="destructive"
      class="relative"
    >
      <AlertCircle class="h-4 w-4" />
      <AlertTitle class="flex items-center justify-between">
        <span>Error Loading Data</span>
        <button
          type="button"
          class="text-sm underline opacity-80 hover:opacity-100"
          @click="ipinfoStore.clearError"
        >
          Dismiss
        </button>
      </AlertTitle>
      <AlertDescription class="mt-2">
        {{ ipinfoStore.error }}
      </AlertDescription>
    </Alert>

    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">
          IP Info Lookup
        </h1>
        <p class="text-muted-foreground">
          Lookup IP addresses for network information
        </p>
      </div>
    </div>

    <!-- IP Lookup Card -->
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <Globe class="h-5 w-5" />
          IP Address Lookup
        </CardTitle>
        <CardDescription>
          Enter an IP address to get information about its location, ISP, and network
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <!-- Search Input -->
        <div class="flex gap-2">
          <div class="relative flex-1">
            <Input
              v-model="ipSearch"
              type="text"
              placeholder="Enter IP address (e.g., 8.8.8.8)"
              @keydown="handleIPKeydown"
            />
          </div>
          <Button @click="handleIPSearch">
            <Search class="mr-2 h-4 w-4" />
            Search
          </Button>
          <Button
            v-if="ipinfoStore.currentIPInfo"
            variant="outline"
            @click="clearIPSearch"
          >
            Clear
          </Button>
        </div>

        <!-- Quick Lookups -->
        <div class="flex flex-wrap gap-2">
          <span class="text-sm text-muted-foreground">Quick lookup:</span>
          <Button
            v-for="quick in quickIPs"
            :key="quick.ip"
            variant="ghost"
            size="sm"
            @click="ipSearch = quick.ip; handleIPSearch()"
          >
            {{ quick.label }}
          </Button>
        </div>

        <!-- Loading State -->
        <div v-if="ipinfoStore.isLoading" class="flex items-center justify-center py-8">
          <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>

        <!-- IP Info Result -->
        <div v-if="ipinfoStore.currentIPInfo && !ipinfoStore.isLoading" class="space-y-4">
          <div class="grid gap-4 md:grid-cols-2">
            <!-- IP Address -->
            <div class="space-y-1">
              <Label>IP Address</Label>
              <p class="font-mono text-lg">{{ ipinfoStore.currentIPInfo.ip }}</p>
            </div>

            <!-- Country -->
            <div v-if="ipinfoStore.currentIPInfo.country" class="space-y-1">
              <Label>Country</Label>
              <p class="flex items-center gap-2">
                <span class="text-xl">{{ getFlagEmoji(ipinfoStore.currentIPInfo.country_code || '') }}</span>
                <span>{{ ipinfoStore.currentIPInfo.country }}</span>
                <Badge variant="secondary">{{ ipinfoStore.currentIPInfo.country_code }}</Badge>
              </p>
            </div>

            <!-- ASN -->
            <div v-if="ipinfoStore.currentIPInfo.asn" class="space-y-1">
              <Label>AS Number</Label>
              <p>
                <Badge class="font-mono">{{ ipinfoStore.currentIPInfo.asn }}</Badge>
              </p>
            </div>

            <!-- AS Name -->
            <div v-if="ipinfoStore.currentIPInfo.as_name" class="space-y-1">
              <Label>Organization</Label>
              <p>{{ ipinfoStore.currentIPInfo.as_name }}</p>
            </div>

            <!-- AS Domain -->
            <div v-if="ipinfoStore.currentIPInfo.as_domain" class="space-y-1">
              <Label>Domain</Label>
              <p class="font-mono text-sm">{{ ipinfoStore.currentIPInfo.as_domain }}</p>
            </div>

            <!-- Continent -->
            <div v-if="ipinfoStore.currentIPInfo.continent" class="space-y-1">
              <Label>Continent</Label>
              <p>{{ ipinfoStore.currentIPInfo.continent }}</p>
            </div>

            <!-- City -->
            <div v-if="ipinfoStore.currentIPInfo.city" class="space-y-1">
              <Label>City</Label>
              <p>{{ ipinfoStore.currentIPInfo.city }}</p>
            </div>

            <!-- Region -->
            <div v-if="ipinfoStore.currentIPInfo.region" class="space-y-1">
              <Label>Region</Label>
              <p>{{ ipinfoStore.currentIPInfo.region }}</p>
            </div>

            <!-- Postal Code -->
            <div v-if="ipinfoStore.currentIPInfo.postal" class="space-y-1">
              <Label>Postal Code</Label>
              <p>{{ ipinfoStore.currentIPInfo.postal }}</p>
            </div>

            <!-- Timezone -->
            <div v-if="ipinfoStore.currentIPInfo.timezone" class="space-y-1">
              <Label>Timezone</Label>
              <p>{{ ipinfoStore.currentIPInfo.timezone }}</p>
            </div>

            <!-- Coordinates -->
            <div v-if="ipinfoStore.currentIPInfo.loc" class="space-y-1">
              <Label>Coordinates</Label>
              <p class="font-mono text-sm">{{ ipinfoStore.currentIPInfo.loc }}</p>
            </div>

            <!-- Organization -->
            <div v-if="ipinfoStore.currentIPInfo.org" class="space-y-1">
              <Label>Organization</Label>
              <p>{{ ipinfoStore.currentIPInfo.org }}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
