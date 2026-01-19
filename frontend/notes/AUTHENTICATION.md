# Authentication Implementation

Sistem autentikasi telah diimplementasikan menggunakan Pinia store, middleware, dan JWT token.

## Struktur File

### Store
- `app/stores/auth.ts` - Pinia store untuk mengelola state autentikasi

### Middleware
- `app/middleware/auth.ts` - Middleware untuk melindungi route yang membutuhkan autentikasi

### Pages
- `app/pages/login.vue` - Halaman login dengan form autentikasi

### Components
- `app/components/layout/Header.vue` - Ditambahkan tombol logout dan info user

## Cara Kerja

1. **Login Flow:**
   - User mengakses `/login`
   - Input username dan password
   - Submit form → memanggil `authStore.login()`
   - API request ke backend `/api/auth/login`
   - Token dan user data disimpan di localStorage dan Pinia store
   - Redirect ke dashboard `/`

2. **Protection:**
   - Middleware `auth.ts` dijalankan pada setiap page route
   - Jika tidak ada token → redirect ke `/login`
   - Jika sudah login dan akses `/login` → redirect ke `/`

3. **Logout:**
   - Klik tombol logout di header
   - Clear localStorage dan Pinia store
   - Redirect ke `/login`

4. **Initialization:**
   - Saat app load, `app.vue` memanggil `authStore.initAuth()`
   - Membaca token dari localStorage
   - Restore authentication state

## Environment Variables

File `.env` sudah dibuat dengan konfigurasi:

```env
NUXT_PUBLIC_API_BASE=http://localhost:5000/api
NUXT_PUBLIC_WS_URL=http://localhost:5000
```

Pastikan backend berjalan di port 5000, atau sesuaikan URL di file `.env`.

## Testing

1. Start backend: `cd backend && npm run start:dev`
2. Start frontend: `cd frontend && npm run dev`
3. Akses http://localhost:3000
4. Anda akan otomatis diarahkan ke `/login`
5. Login dengan kredensial yang valid
6. Setelah login sukses, akan diarahkan ke dashboard

## Security Features

- JWT token disimpan di localStorage
- Token dikirim via Authorization header: `Bearer <token>`
- Middleware melindungi semua route kecuali `/login`
- Password type input untuk keamanan
- Auto-redirect jika sudah login
