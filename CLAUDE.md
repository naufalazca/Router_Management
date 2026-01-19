# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MikroTik Router Management System - A full-stack web application for monitoring, configuring, and managing multiple MikroTik RouterOS devices from a centralized dashboard. Built with Express (backend) and Nuxt 3 (frontend).

## Development Commands

### Initial Setup
```bash
# Install all dependencies (root, backend, and frontend)
npm run install:all

# Setup environment files
cp .env.example .env
cd backend && cp .env.example .env
cd ../frontend && cp .env.example .env

# Start PostgreSQL and Redis
npm run db:start

# Generate Prisma Client and run migrations
cd backend
npm run prisma:generate
npm run prisma:migrate

# (Optional) Seed database with initial data
npm run prisma:seed
```

### Development
```bash
# Run everything (backend, frontend, and database) concurrently
npm run dev

# Or run individually:
npm run dev:backend   # Backend only (port 4000)
npm run dev:frontend  # Frontend only (port 3000)
npm run dev:db       # Database containers only
```

### Database Management
```bash
# Start database containers in background
npm run db:start

# Stop database containers
npm run db:stop

# Reset database (WARNING: destroys all data)
npm run db:reset

# Open Prisma Studio (database GUI)
cd backend && npm run prisma:studio
```

### Backend Commands (from /backend directory)
```bash
npm run start:dev      # Development server with hot reload (tsx watch)
npm run build          # Compile TypeScript to JavaScript
npm start              # Run production build
npm run prisma:generate  # Generate Prisma Client
npm run prisma:migrate   # Run database migrations
npm run prisma:studio    # Open Prisma Studio
npm run prisma:seed      # Seed database
```

### Frontend Commands (from /frontend directory)
```bash
npm run dev          # Development server
npm run build        # Build for production (SSR)
npm run preview      # Preview production build
npm run generate     # Generate static site
npm run lint         # Lint code
npm run format       # Auto-fix linting and formatting issues
```

## Architecture

### Backend Architecture (Express + TypeScript)

The backend follows a layered architecture pattern:

**Entry Point:** [src/index.ts](backend/src/index.ts) - Express app setup with middleware chain
- Helmet for security headers
- CORS with credential support
- Rate limiting (configurable per endpoint)
- JSON body parsing
- Global error handler (must be last middleware)

**Routing Structure:**
- [src/routes/index.ts](backend/src/routes/index.ts) - Main route aggregator mounting all sub-routers under `/api`
- Feature-specific route files in `src/routes/` (e.g., `router.routes.ts`)
- Controllers handle HTTP logic in `src/controllers/`
- Services contain business logic in `src/services/`

**Data Layer:**
- Prisma ORM with PostgreSQL
- Single Prisma client instance exported from [src/lib/prisma.ts](backend/src/lib/prisma.ts)
- Schema defined in [prisma/schema.prisma](backend/prisma/schema.prisma)

**Key Backend Patterns:**
- Validators use Zod schemas in `src/validators/` for request validation
- Configuration centralized in `src/config/` using environment variables
- Error handling through custom middleware in [src/middleware/errorHandler.ts](backend/src/middleware/errorHandler.ts)
- Rate limiting configured in [src/middleware/rateLimiter.ts](backend/src/middleware/rateLimiter.ts)

### Frontend Architecture (Nuxt 3 + Vue 3)

**Note:** This project uses a dashboard template (nuxt-shadcn-dashboard) as its base. The structure includes pre-built components and pages from that template.

**Framework Configuration:** [nuxt.config.ts](frontend/nuxt.config.ts)
- TypeScript enabled
- Modules: Tailwind CSS, Shadcn-nuxt, Nuxt UI, Pinia, VueUse
- Shadcn UI components in `app/components/ui/`
- File-based routing from `app/pages/`

**State Management:**
- Pinia stores in `app/stores/` directory
- VueUse composables for common functionality
- Socket.io client planned for real-time updates

**Code Organization:**
- Pages in `app/pages/` directory
- Reusable components in `app/components/`
- Layouts in `app/layouts/`
- Composable functions in `app/composables/`
- TypeScript types in `app/types/`
- Utility functions in `app/lib/`
- Nuxt plugins in `app/plugins/`

## Database Schema

### Core Tables

**routers** - MikroTik device inventory
- Stores router details (name, IP, MAC, model, location)
- `status` enum: ACTIVE, INACTIVE, MAINTENANCE
- `lastSeen` timestamp for connection tracking

**users** - User authentication and authorization
- Passwords stored hashed (bcrypt)
- `role` enum: ADMIN, USER, VIEWER
- `isActive` flag for account status

### Planned Tables (per README.md)
- **router_configs** - Configuration snapshots
- **monitoring_logs** - Time-series monitoring data
- **audit_logs** - Audit trail for all actions

## Security Implementation

### Credential Storage
Router passwords must be encrypted using AES-256-GCM before storage. The encryption key is stored in `ENCRYPTION_KEY` environment variable (must be exactly 32 characters).

### Authentication Flow
1. User credentials validated with bcrypt
2. JWT token generated (secret from `JWT_SECRET` env var)
3. Token payload: `{ userId, username, role }`
4. Token expiry configurable via `JWT_EXPIRES_IN` (default: 7d)
5. Frontend stores token in localStorage
6. All API requests include `Authorization: Bearer <token>` header

### Role-Based Access Control (RBAC)
- **ADMIN**: Full system access including user management
- **USER** (OPERATOR in docs): Read/write access, no user management
- **VIEWER**: Read-only access

### API Security Middleware Stack
1. Helmet - Security headers
2. CORS - Whitelisted origins from config
3. Rate limiting - Configured per endpoint
4. Input validation - Zod schemas on all DTOs
5. Error sanitization - Production errors hide implementation details

## Planned Features (Not Yet Implemented)

Per README.md roadmap, these are planned but not implemented:
- RouterOS API integration for live monitoring
- BullMQ job queue for background monitoring tasks
- Redis caching layer
- Socket.io Gateway for real-time updates
- Configuration backup/restore functionality
- Monitoring metrics collection (CPU, memory, disk, bandwidth)
- Alert system and email notifications
- API documentation (Swagger)
- Unit and E2E tests

## Environment Variables

### Backend (.env in /backend)
```env
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

DATABASE_URL=postgresql://router_admin:password@localhost:5432/router_management

# Future Redis configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Authentication
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Router credential encryption (32 characters required)
ENCRYPTION_KEY=32-character-encryption-key

# CORS Configuration
CORS_ORIGIN=http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Frontend (.env in /frontend)
```env
NUXT_PUBLIC_API_BASE=http://localhost:4000/api
NUXT_PUBLIC_WS_URL=http://localhost:4000
```

## RouterOS API Integration (Future)

When implementing MikroTik API client:
- Use RouterOS API port 8728 (or 8729 for SSL)
- Connection library: `routeros-client` npm package (referenced in README)
- Implement connection pooling for multiple routers
- Use exponential backoff for retry logic on connection failures
- Store connection credentials encrypted in database
- Decrypt credentials only in-memory when establishing connections

## Monitoring Job Design (Future)

BullMQ queue architecture (per README.md):
- Job interval: Every 30 seconds per router
- Processor: Fetch metrics via RouterOS API
- Storage: Write to monitoring_logs table
- Cache: Latest metrics in Redis (TTL: 60s)
- Real-time: Emit Socket.io events to connected clients
- Error handling: Retry 3 times, then move to dead letter queue

## Monorepo Structure

This is a monorepo with separate backend and frontend packages:
- Root `package.json` provides convenience scripts running both services
- Backend and frontend have independent dependencies
- Always run `npm install` in the specific directory when adding new packages
- Docker Compose at root manages shared infrastructure (PostgreSQL, Redis)

## Important Notes

### Backend Notes
- The README.md mentions **NestJS** and **Fastify** in tech stack, but the actual implementation uses **Express** (see [src/index.ts](backend/src/index.ts:1))
- Configuration validation in [src/config/index.ts](backend/src/config/index.ts:29) requires `DATABASE_URL`, `JWT_SECRET`, and `ENCRYPTION_KEY` to be set
- Prisma client automatically logs queries in development mode
- Error handler must be registered last in middleware chain

### Frontend Notes
- The frontend uses a pre-built dashboard template (nuxt-shadcn-dashboard)
- All app code is in the `app/` directory, not root level
- Default ports differ between README (3000) and actual config (.env.example shows backend on 5000, CORS_ORIGIN points to 5173)
- Uses pnpm as package manager (see `packageManager` in package.json)
