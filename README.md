# Router Management System

Sistem manajemen untuk router MikroTik RouterOS yang memungkinkan monitoring, konfigurasi, dan pengelolaan multiple router dari satu dashboard.

## Tech Stack

### Backend
- **NestJS** - Progressive Node.js framework
- **TypeScript** - Type-safe JavaScript
- **Fastify** - Fast web framework
- **PostgreSQL** - Primary database
- **Prisma ORM** - Database toolkit
- **Redis** - Caching & job queue
- **BullMQ** - Job queue untuk monitoring tasks
- **Socket.io** - Real-time communication
- **RouterOS Client** - MikroTik API client

### Frontend
- **Nuxt 3** - Vue.js framework
- **Vue 3** - Progressive JavaScript framework
- **Pinia** - State management
- **TanStack Query** - Server state management
- **Tailwind CSS** - Utility-first CSS
- **Nuxt UI** - UI component library
- **Socket.io Client** - Real-time updates

## Features

- ✅ **Real-time Monitoring**: CPU, memory, disk, bandwidth, temperature
- ✅ **Configuration Management**: Backup, restore, deploy configs
- ✅ **User Management**: Multi-role access control (Admin, Operator, Viewer)
- ✅ **Audit Logging**: Track all actions and changes
- ✅ **Multi-Router Support**: Manage 10-100+ routers
- ✅ **Secure Credentials**: Encrypted storage of router passwords
- ✅ **WebSocket Updates**: Real-time status updates

## Prerequisites

- Node.js >= 18.x
- Docker & Docker Compose
- npm atau yarn

## Quick Start

### 1. Clone & Install

```bash
# Clone repository
cd Router_Management

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Setup Environment

```bash
# Backend
cd backend
cp .env.example .env
# Edit .env dan sesuaikan konfigurasi

# Frontend
cd ../frontend
cp .env.example .env
# Edit .env dan sesuaikan API URL
```

### 3. Start Database & Redis

```bash
# Di root directory
docker-compose up -d

# Verify containers running
docker-compose ps
```

### 4. Setup Database

```bash
cd backend

# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# (Optional) Open Prisma Studio
npm run prisma:studio
```

### 5. Run Development Servers

```bash
# Terminal 1 - Backend
cd backend
npm run start:dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Backend akan berjalan di: http://localhost:4000
Frontend akan berjalan di: http://localhost:3000

## Project Structure

```
Router_Management/
├── backend/
│   ├── src/
│   │   ├── common/           # Shared utilities, guards, decorators
│   │   ├── config/           # Configuration files
│   │   ├── modules/
│   │   │   ├── auth/         # Authentication & authorization
│   │   │   ├── routers/      # Router management
│   │   │   ├── users/        # User management
│   │   │   ├── monitoring/   # Real-time monitoring
│   │   │   └── config-management/  # Config backup/restore
│   │   ├── database/         # Prisma service
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── prisma/
│   │   └── schema.prisma     # Database schema
│   └── package.json
│
├── frontend/
│   ├── assets/               # CSS, images
│   ├── components/           # Vue components
│   ├── composables/          # Composable functions
│   ├── layouts/              # Page layouts
│   ├── middleware/           # Route middleware
│   ├── pages/                # Page components (routes)
│   ├── plugins/              # Nuxt plugins
│   ├── stores/               # Pinia stores
│   ├── types/                # TypeScript types
│   ├── utils/                # Utility functions
│   ├── app.vue
│   ├── nuxt.config.ts
│   └── package.json
│
└── docker-compose.yml        # PostgreSQL & Redis
```

## Database Schema

### Tables

- **users** - User accounts dengan role-based access
- **routers** - Router information dengan encrypted credentials
- **router_configs** - Configuration snapshots
- **monitoring_logs** - Time-series monitoring data
- **audit_logs** - Audit trail untuk semua actions

### Relationships

```
User 1---* AuditLog
Router 1---* RouterConfig
Router 1---* MonitoringLog
Router 1---* AuditLog
```

## API Endpoints (Planned)

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Routers
- `GET /api/routers` - List all routers
- `POST /api/routers` - Add new router
- `GET /api/routers/:id` - Get router details
- `PUT /api/routers/:id` - Update router
- `DELETE /api/routers/:id` - Delete router
- `POST /api/routers/:id/test` - Test connection

### Monitoring
- `GET /api/monitoring/:routerId` - Get monitoring data
- `GET /api/monitoring/:routerId/realtime` - WebSocket endpoint

### Configuration
- `GET /api/configs/:routerId` - List configs
- `POST /api/configs/:routerId/backup` - Backup config
- `POST /api/configs/:routerId/restore` - Restore config

## Environment Variables

### Backend (.env)

```env
NODE_ENV=development
PORT=4000
FRONTEND_URL=http://localhost:3000

DATABASE_URL=postgresql://router_admin:password@localhost:5432/router_management

REDIS_HOST=localhost
REDIS_PORT=6379

JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

ENCRYPTION_KEY=32-character-encryption-key
```

### Frontend (.env)

```env
NUXT_PUBLIC_API_BASE=http://localhost:4000/api
NUXT_PUBLIC_WS_URL=http://localhost:4000
```

## Development

### Backend Commands

```bash
npm run start:dev      # Start development server
npm run build          # Build for production
npm run start:prod     # Start production server
npm run lint           # Run ESLint
npm run format         # Format with Prettier
npm run test           # Run tests

# Prisma
npm run prisma:generate  # Generate Prisma Client
npm run prisma:migrate   # Run migrations
npm run prisma:studio    # Open Prisma Studio
```

### Frontend Commands

```bash
npm run dev            # Start development server
npm run build          # Build for production
npm run preview        # Preview production build
npm run generate       # Generate static site
npm run lint           # Run ESLint
npm run lint:fix       # Fix ESLint errors
```

## Production Deployment

### Using Docker (Recommended)

```bash
# TODO: Add Dockerfile untuk backend dan frontend
docker-compose -f docker-compose.prod.yml up -d
```

### Manual Deployment

```bash
# Backend
cd backend
npm run build
npm run start:prod

# Frontend (SSR mode)
cd frontend
npm run build
npm run preview

# Frontend (Static mode)
cd frontend
npm run generate
# Serve .output/public dengan Nginx/Apache
```

## Security Considerations

1. **Encrypted Credentials**: Password router di-encrypt menggunakan AES-256-GCM
2. **JWT Authentication**: Secure token-based auth
3. **Role-based Access**: ADMIN, OPERATOR, VIEWER roles
4. **Audit Logging**: Semua actions tercatat
5. **Environment Variables**: Sensitive data di .env (tidak di-commit)
6. **HTTPS**: Gunakan HTTPS di production
7. **Rate Limiting**: Implement rate limiting di production

## Contributing

1. Fork the project
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## License

MIT

## Roadmap

- [x] Project setup
- [x] Database schema design
- [ ] Authentication module
- [ ] Router CRUD operations
- [ ] RouterOS API integration
- [ ] Real-time monitoring
- [ ] Configuration backup/restore
- [ ] Dashboard UI
- [ ] User management UI
- [ ] Monitoring charts
- [ ] Alert system
- [ ] Email notifications
- [ ] API documentation (Swagger)
- [ ] Unit tests
- [ ] E2E tests
- [ ] Docker deployment
- [ ] CI/CD pipeline

## Support

Untuk bug reports dan feature requests, silakan buka issue di GitHub.
