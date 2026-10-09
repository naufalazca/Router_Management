# Dead Code Audit & Cleanup Plan — Router_Management

## Goal
Membersihkan dead code yang **terbukti** mati (moderat) di backend Express/Prisma + frontend Nuxt, tanpa mengubah perilaku runtime.

## Method / Evidence
- Audit read-only: `graphify` (graph sudah ada, dipakai untuk konteks struktur) + `knip` (backend & frontend) + `ts-prune`, lalu **verifikasi manual tiap temuan dengan ripgrep** karena kedua tool menghasilkan banyak false positive (Nuxt auto-import, `resolveComponent()`, singleton service).
- Semua klaim di bawah sudah diverifikasi terhadap source.

## Scope
- Backend: `backend/src`
- Frontend: `frontend/app`
- Dependency frontend: `frontend/package.json`

---

## Part A — HAPUS (terbukti mati, aman)

### A1. Backend — 7 validator orphan (tidak pernah diimpor)
Tidak ada route/controller/service yang mengimpor file-file ini (`kanban.routes.ts` & `routeros.routing.routes.ts` tidak memakai validator):
- `backend/src/validators/kanban/board.validator.ts`
- `backend/src/validators/kanban/boardList.validator.ts`
- `backend/src/validators/kanban/comment.validator.ts`
- `backend/src/validators/kanban/label.validator.ts`
- `backend/src/validators/kanban/task.validator.ts`
- `backend/src/validators/kanban/timeEntry.validator.ts`
- `backend/src/validators/routeros/routeros.routing.validator.ts`

Aksi: hapus seluruh file.

### A2. Backend — export mati di `src/lib/routeros/constants.ts`
Hanya `TROUBLESHOOT_DEFAULTS` dan `USER_COMMANDS` yang dipakai (oleh `routeros.troubleshoot.service.ts` dan `routeros.user.service.ts`).
Hapus konstanta yang tidak dipakai:
`ROUTEROS_SSL_PORT`, `BACKUP_COMMANDS`, `FILE_COMMANDS`, `SYSTEM_COMMANDS`, `INTERFACE_COMMANDS`, `BGP_COMMANDS`, `USER_GROUPS`.

### A3. Backend — export mati di `src/lib/backup-storage.ts`
`routeros.backup.service.ts` hanya mengimpor `uploadBackup`, `generateBackupStorageKey`, `parseConfigSummary`, `extractRouterOSVersion`, `generateBackupDownloadUrl`, `downloadAndVerifyBackup`, `deleteBackup`.
Hapus fungsi yang tidak diimpor siapa pun:
`downloadBackup`, `deleteBackups`, `backupExists`, `getBackupMetadata`, `listRouterBackups`, `getRouterBackupStats`.
(Catatan: `calculateChecksum` dipakai internal — **pertahankan**.)

### A4. Backend — exported types mati (hanya didefinisikan, tidak pernah diimpor)
Hapus alias type `z.infer` berikut (schema-nya tetap dipakai, hanya alias type-nya yang mati):
- `company.validator.ts`: `CreateCompanyInput`, `UpdateCompanyInput`
- `ipinfo.validator.ts`: `IpParamInput`
- `routeros/routeros.backup.validator.ts`: `TriggerBackupDTO`, `RestoreBackupDTO`, `PinBackupDTO`, `ListBackupsQuery`, `DownloadUrlQuery` (controller mengimpor schema, bukan DTO)
- `router/router.validator.ts`: `CreateRouterInput`, `UpdateRouterInput` — **lihat catatan risiko file in-progress di Part D**

### A5. Frontend — utilitas mati
- Hapus file `frontend/app/components/ui/table/utils.ts` (`valueUpdater` tidak diimpor).
- Hapus fungsi `valueUpdater` di `frontend/app/lib/utils.ts` (duplikat, tidak diimpor).

### A6. Frontend — dependency redundan
- Tinjau & hapus `@unhead/vue` dari `devDependencies` (`useHead`/`useSeoMeta` sudah disediakan Nuxt; tidak ada impor langsung `@unhead/vue`).
- **JANGAN** hapus `@iconify-json/lucide` (dipakai luas via `i-lucide-*`) dan `@iconify-json/radix-icons` (dipakai via `i-radix-icons-check` di `ThemeCustomize.vue`). Knip salah lapor keduanya.

---

## Part B — TINJAU (jangan hapus tanpa verifikasi lanjut)

- `frontend/app/composables/validator/router/useRouterValidation.ts` (`isValidHost`): saat ini belum dipakai. File ini **baru ditambahkan (untracked)** dan bersamaan dengan modifikasi router modals → kemungkinan **work-in-progress**. Jangan hapus; konfirmasi ke author apakah akan dipakai.
- Backend exported types di `lib/routeros/types.ts` (`RouterOSBackup`, `ParsedBackup`, `RouterConnection`) dan `router.test.service.ts` (`ConnectionType`, `TestResult`, dst.): knip flag, tapi kelas/instance-nya dipakai. Verifikasi per-simbol sebelum menghapus — **kemungkinan besar PERTAHANKAN**.
- Type declarations non-export yang tampak mati di `user.service.ts` (`LoginCredentials`, `CreateUserData`, `UpdateUserData`, `AuthPayload`): perlu cek apakah dipakai internal di file yang sama.

---

## Part C — JANGAN SENTUH (false positive terverifikasi)
- Semua controller/service backend kanban & routeros: dipakai via instance singleton yang diimpor route (mis. `routerOSBackupService`, `routerOSRoutingService`, `routerOSTestService`).
- `frontend/app/components/layout/SidebarNavGroup.vue` & `SidebarNavLink.vue`: dipakai via `resolveComponent('LayoutSidebarNavGroup'/'LayoutSidebarNavLink')` di `AppSidebar.vue`.
- `frontend/app/components/ui/collapsible/*`: auto-import & dipakai di `SidebarNavGroup.vue`.
- Semua komponen non-`ui` frontend: terverifikasi direferensikan (auto-import Nuxt + impor path eksplisit).
- `frontend/app/constants/menus.ts`, `types/backup.ts`, `types/kanban-api.ts`: interface-nya dipakai; anggota yang di-flag knip (mis. `TriggerType`, `TimeEntryType`, `TaskLabel`) adalah field dari interface yang dipakai → PERTAHANKAN.

---

## Part D — Risks & Guardrails
- **File in-progress jangan diutak-atik lebih dari yang perlu**: `backend/src/validators/router/router.validator.ts`, `frontend/app/components/router/RouterCreateModal.vue`, `RouterEditModal.vue`, dan `frontend/app/composables/validator/router/useRouterValidation.ts` (untracked). Untuk A4 pada `router.validator.ts`, hanya hapus dua alias type tanpa menyentuh schema/`hostSchema`.
- Jangan hapus export yang hanya dipakai internal file yang sama.
- Urutkan: hapus file orphan (A1) dulu, lalu prune export (A2–A5), verifikasi tipe, baru dependency (A6).

## Validation (wajib setelah tiap part)
1. Backend: `npm run build` (di `backend/`) → `tsc` harus lolos (tsconfig `strict` + `noUnusedLocals/Parameters`).
2. Frontend: `npm run typecheck` (`vue-tsc --noEmit`) dan `npm run lint` (di `frontend/`).
3. Jalankan dev server singkat / smoke test route yang tersentuh (`/api/kanban/*`, `/api/routeros/:id/bgp/*`, `/api/company`, `/api/ipinfo`, `/api/routeros/backup`) untuk memastikan tidak ada impor yang putus.
4. `graphify update .` untuk menyegarkan graph.
5. Pasca-cleanup: jalankan `npx knip --directory backend` & `npx knip --directory frontend` lagi, pastikan temuan sisa hanya false-positive yang sudah didokumentasikan di Part C.

## Out of Scope
- Refactor struktur/arsitektur.
- Menghapus kode yang butuh perubahan perilaku atau migrasi data.
- Dependency backend (belum ada temuan).

## Open Questions
- Apakah `useRouterValidation.ts` memang akan segera dipakai (WIP)? Jika rencananya dibatalkan, tambahkan ke Part A sebagai hapus.
- Apakah `@unhead/vue` boleh dihapus, atau sengaja dipin untuk API head versi spesifik? (Rekomendasi: hapus, Nuxt sudah menyediakan.)
