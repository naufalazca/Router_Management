# Authentication Middleware

Middleware untuk authentication dan authorization di aplikasi Router Management System.

## Overview

File: `src/middleware/auth.ts`

Menyediakan middleware untuk:
- **Authentication**: Verifikasi JWT token
- **Authorization**: Validasi role pengguna (ADMIN, USER, VIEWER)

## Middleware Functions

### 1. `authenticate`
Memverifikasi JWT token dan attach user data ke `req.user`.

**Usage:**
```typescript
import { authenticate } from '../middleware/auth';

router.use(authenticate);  // Apply to all routes
// atau
router.get('/protected', authenticate, controller.method);  // Apply to specific route
```

**Response jika gagal:**
- 401: Token tidak ada atau invalid
- Error message: "No token provided" atau "Invalid or expired token"

### 2. `requireAdmin`
Memastikan user memiliki role ADMIN. Harus digunakan setelah `authenticate`.

**Usage:**
```typescript
import { authenticate, requireAdmin } from '../middleware/auth';

// Apply to all routes
router.use(authenticate);
router.use(requireAdmin);

// Apply to specific route
router.post('/admin-only', authenticate, requireAdmin, controller.method);
```

**Response jika gagal:**
- 401: User belum authenticated
- 403: User bukan ADMIN
- Error message: "Access denied. Admin role required."

### 3. `requireUser`
Memastikan user memiliki role USER atau ADMIN. Harus digunakan setelah `authenticate`.

**Usage:**
```typescript
import { authenticate, requireUser } from '../middleware/auth';

router.get('/user-area', authenticate, requireUser, controller.method);
```

**Response jika gagal:**
- 401: User belum authenticated
- 403: User role VIEWER (bukan USER/ADMIN)
- Error message: "Access denied. User role or higher required."

### 4. `requireViewer`
Memastikan user sudah authenticated (semua role diperbolehkan). Harus digunakan setelah `authenticate`.

**Usage:**
```typescript
import { authenticate, requireViewer } from '../middleware/auth';

router.get('/read-only', authenticate, requireViewer, controller.method);
```

**Response jika gagal:**
- 401: User belum authenticated

## Token Format

JWT token harus dikirim via Authorization header:
```
Authorization: Bearer <token>
```

Token payload berisi:
```typescript
{
  userId: string;
  username: string;
  role: 'ADMIN' | 'USER' | 'VIEWER';
}
```

## Implementation Example

### Kanban Routes (Admin Only)
File: `src/routes/kanban/kanban.routes.ts`

```typescript
import { authenticate, requireAdmin } from '../../middleware/auth';

const router = Router();

// Apply authentication and ADMIN authorization to ALL Kanban routes
router.use(authenticate);
router.use(requireAdmin);

// All routes below require ADMIN role
router.get('/boards', boardController.getUserBoards);
router.post('/boards', boardController.createBoard);
// ... etc
```

### Mixed Authorization Example
```typescript
import { authenticate, requireAdmin, requireUser, requireViewer } from '../middleware/auth';

const router = Router();

// Public route - no auth
router.get('/public', controller.publicData);

// Read-only - any authenticated user
router.get('/data', authenticate, requireViewer, controller.getData);

// Write access - USER or ADMIN
router.post('/data', authenticate, requireUser, controller.createData);

// Admin only
router.delete('/data/:id', authenticate, requireAdmin, controller.deleteData);
```

## Request Object

Setelah `authenticate` middleware dijalankan, `req.user` akan tersedia:

```typescript
// In controller
async someController(req: Request, res: Response) {
  const userId = req.user?.userId;
  const username = req.user?.username;
  const role = req.user?.role;

  // Use user data...
}
```

## Environment Variables

Required:
- `JWT_SECRET`: Secret key untuk verifikasi JWT token (default: 'your-secret-key')

## Error Handling

Semua middleware mengembalikan response dalam format:
```json
{
  "success": false,
  "message": "Error message here"
}
```

Status codes:
- **401 Unauthorized**: Authentication gagal (token invalid/missing)
- **403 Forbidden**: Authorization gagal (user tidak punya akses)

## Role Hierarchy

```
VIEWER  < USER  < ADMIN
  |       |       |
  |       |       └─ Full access
  |       └─ Read + Write access
  └─ Read-only access
```

- `requireViewer`: VIEWER, USER, ADMIN ✓
- `requireUser`: USER, ADMIN ✓
- `requireAdmin`: ADMIN ✓

## Notes

1. Middleware `authenticate` HARUS dipanggil sebelum middleware authorization (`requireAdmin`, `requireUser`, `requireViewer`)
2. Gunakan `router.use()` untuk apply ke semua routes dalam router
3. Role disimpan sebagai string ('ADMIN', 'USER', 'VIEWER') di `req.user.role`
4. Token diverifikasi menggunakan `jsonwebtoken` library
