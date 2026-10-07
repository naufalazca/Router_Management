# Generate & Regenerate Komponen

Panduan untuk membuat ulang komponen shadcn-vue `ui/*` yang dihapus oleh cleanup dead-code, serta scaffold artifact Nuxt baru. Tujuan: komponen bisa di-restore cepat tanpa reverse-engineering.

## Struktur

- `frontend/components.json` — konfigurasi shadcn-vue (style `new-york`, aliases `@/components/ui`, `@/lib/utils`, iconLibrary `lucide`, css `app/assets/css/tailwind.css`).
- `frontend/notes/removed-ui-components.json` — manifest komponen yang dihapus cleanup (untuk batch restore).
- `frontend/app/constants/menus.ts` — satu-satunya sumber nav sidebar (`navMenu`).

## Prasyarat

- Node 22.x (`engines` di `package.json`).
- Package manager: **npm** (repo memakai `package-lock.json`; tidak ada field `packageManager`). Jalankan dari direktori `frontend/`.

```bash
cd frontend
npm install
```

## Regenerate Komponen shadcn-vue `ui/*`

Komponen yang dihapus karena tidak dipakai bisa ditambah kembali on-demand.

```bash
# satu komponen
npx shadcn-vue@latest add <nama>

# contoh
npx shadcn-vue@latest add accordion
```

Batch restore dari manifest:

```powershell
Get-Content frontend/notes/removed-ui-components.json `
  | ConvertFrom-Json `
  | ForEach-Object { $_.uiDirs } `
  | ForEach-Object { npx shadcn-vue@latest add $_ }
```

Jika `components.json` hilang, init ulang dulu:

```bash
npx shadcn-vue@latest init
```

Komponen yang dihapus cleanup: lihat `frontend/notes/removed-ui-components.json` (`uiDirs`). Semua bisa di-add ulang sesuai kebutuhan.

**Penting:** tambahkan komponen `ui/*` hanya saat benar-benar dipakai — jangan import ulang semua dir yang dihapus. Ini yang bikin repo dead-code lagi.

### Catatan restore

- `auto-form` bukan nama resmi registry shadcn di semua versi. Kalau `npx shadcn-vue@latest add auto-form` gagal, anggap sebagai komponen **repo-local** (tidak bisa di-restore via CLI).
- Beberapa entri baru (`empty`, `input-group`, `button-group`, `spinner`, `item`) mungkin belum tersedia di registry CLI. Kalau gagal resolve, catat sebagai repo-local juga.

## Scaffold Artifact Nuxt

```bash
npx nuxi add page <path>          # halaman baru (lalu tambahkan entri nav di app/constants/menus.ts)
npx nuxi add component <Name>     # komponen (auto-import)
npx nuxi add composable <name>    # composable (auto-import)
npx nuxi add layout <name>        # layout
npx nuxi add plugin <name>        # plugin
npx nuxi add middleware <name>    # middleware
npx nuxi module add <module>      # tambah modul Nuxt (auto-register di nuxt.config.ts)
```

Pinia store tidak punya generator `nuxi`. Buat manual `app/stores/<name>.ts` dengan `defineStore`.

## Aturan Auto-import

- **Components** `app/components/**` — auto-import berdasarkan path + basename; prefix dir bersarang. Contoh `routeros/backup/RouterosBackupHeader.vue` → `<RouterosBackupHeader>`. Dikonfigurasi di `nuxt.config.ts` `components: [{ path: '~/components' }]`.
- **Composables** `app/composables/**` — auto-import berdasarkan nama fungsi.
- **`app/lib/**`** — auto-import via `imports.dirs: ['./lib']` di `nuxt.config.ts`.
- **Stores** `app/stores/**` — **TIDAK** auto-import. Selalu `import { useXStore } from '~/stores/x'`.
- **Icon** — koleksi dimuat `@nuxt/icon`; pakai `<Icon name="i-lucide-*" />` atau `i-radix-icons-*`. Paket `@iconify-json/*` tetap terpasang walau tidak ada string ref langsung.
- **shadcn `ui/*`** — dikonsumsi via import eksplisit `@/components/ui/<dir>` (barrel `index.ts`), bukan bare auto-import.

## Peta Route & Nav Live

Halaman yang benar-benar dipakai app:

| Route | File |
| --- | --- |
| `/` | `app/pages/index.vue` |
| `/login` | `app/pages/login.vue` (layout: false) |
| `/router` | `app/pages/router.vue` |
| `/company` | `app/pages/company.vue` |
| `/ipinfo` | `app/pages/ipinfo.vue` |
| `/kanban` | `app/pages/kanban.vue` |
| `/topology` | `app/pages/topology.vue` |
| `/routeros/user` | `app/pages/routeros/user.vue` |
| `/routeros/backup` | `app/pages/routeros/backup.vue` |
| `/routeros/troubleshoot_ping` | `app/pages/routeros/troubleshoot_ping.vue` |
| `/routeros/troubleshoot_traceroute` | `app/pages/routeros/troubleshoot_traceroute.vue` |
| `/routeros/routing_connection` | `app/pages/routeros/routing_connection.vue` |
| `/routeros/routing_advertisement` | `app/pages/routeros/routing_advertisement.vue` |
| `/routeros/routing_session` | `app/pages/routeros/routing_session.vue` |
| `(error)/*`, `error.vue` | halaman error |

Halaman baru harus ditambahkan ke `navMenu` di `app/constants/menus.ts` agar muncul di sidebar (`AppSidebar.vue` membaca `navMenu`).

## Modul & Dependency

Modul yang tersisa di `nuxt.config.ts`:

`shadcn-nuxt`, `@vueuse/nuxt`, `@nuxt/eslint`, `@nuxt/icon`, `@pinia/nuxt`, `@nuxtjs/color-mode`, `@nuxt/fonts`, `@nuxt/ui`.

Modul yang dihapus cleanup: `@nuxt/content`, `@nuxt/hints`, `@nuxt/image`, `@nuxt/scripts`.

Dependency yang dihapus cleanup: `@number-flow/vue`, `@vue-flow/minimap`, `better-sqlite3`, `nanoid`, `@unovis/ts`, `@unovis/vue`, `embla-carousel`, `embla-carousel-vue`, `date-fns`, `vaul-vue`, `@vueuse/math`, `vee-validate`, `@vee-validate/zod`, `zod`.

## Verifikasi

```bash
cd frontend
npm run lint
npm run typecheck
npm run build
```
