-- CreateEnum
CREATE TYPE "BackupType" AS ENUM ('EXPORT', 'BINARY', 'PARTIAL');

-- CreateEnum
CREATE TYPE "BackupStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "TriggerType" AS ENUM ('MANUAL', 'SCHEDULED', 'PRE_UPDATE');

-- CreateEnum
CREATE TYPE "RestoreStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'ROLLED_BACK');

-- CreateEnum
CREATE TYPE "RestoreType" AS ENUM ('FULL', 'PREVIEW', 'PARTIAL');

-- CreateTable
CREATE TABLE "router_backups" (
    "id" TEXT NOT NULL,
    "router_id" TEXT NOT NULL,
    "backup_type" "BackupType" NOT NULL DEFAULT 'EXPORT',
    "storage_key" TEXT NOT NULL,
    "storage_url" TEXT,
    "file_size" BIGINT NOT NULL,
    "checksum" TEXT NOT NULL,
    "router_version" TEXT,
    "backup_status" "BackupStatus" NOT NULL DEFAULT 'PENDING',
    "trigger_type" "TriggerType" NOT NULL,
    "triggered_by" TEXT,
    "config_summary" JSONB,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "pinned_by" TEXT,
    "pinned_at" TIMESTAMP(3),
    "pinned_reason" TEXT,
    "is_safety_backup" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "router_backups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backup_schedules" (
    "id" TEXT NOT NULL,
    "router_id" TEXT,
    "company_id" TEXT,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "cron_expression" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "retention_days" INTEGER NOT NULL DEFAULT 7,
    "retention_weeks" INTEGER NOT NULL DEFAULT 4,
    "retention_months" INTEGER NOT NULL DEFAULT 12,
    "last_run_at" TIMESTAMP(3),
    "next_run_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "backup_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backup_restores" (
    "id" TEXT NOT NULL,
    "backup_id" TEXT NOT NULL,
    "router_id" TEXT NOT NULL,
    "restore_status" "RestoreStatus" NOT NULL DEFAULT 'PENDING',
    "restored_by" TEXT NOT NULL,
    "restore_type" "RestoreType" NOT NULL DEFAULT 'FULL',
    "safety_backup_id" TEXT,
    "error_message" TEXT,
    "restore_log" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "backup_restores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "router_backups_router_id_created_at_idx" ON "router_backups"("router_id", "created_at");

-- CreateIndex
CREATE INDEX "router_backups_backup_status_idx" ON "router_backups"("backup_status");

-- CreateIndex
CREATE INDEX "router_backups_expires_at_idx" ON "router_backups"("expires_at");

-- CreateIndex
CREATE INDEX "router_backups_is_pinned_idx" ON "router_backups"("is_pinned");

-- CreateIndex
CREATE INDEX "backup_schedules_router_id_idx" ON "backup_schedules"("router_id");

-- CreateIndex
CREATE INDEX "backup_schedules_company_id_idx" ON "backup_schedules"("company_id");

-- CreateIndex
CREATE INDEX "backup_schedules_next_run_at_idx" ON "backup_schedules"("next_run_at");

-- CreateIndex
CREATE INDEX "backup_restores_backup_id_idx" ON "backup_restores"("backup_id");

-- CreateIndex
CREATE INDEX "backup_restores_router_id_idx" ON "backup_restores"("router_id");

-- CreateIndex
CREATE INDEX "backup_restores_created_at_idx" ON "backup_restores"("created_at");

-- AddForeignKey
ALTER TABLE "router_backups" ADD CONSTRAINT "router_backups_router_id_fkey" FOREIGN KEY ("router_id") REFERENCES "routers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backup_schedules" ADD CONSTRAINT "backup_schedules_router_id_fkey" FOREIGN KEY ("router_id") REFERENCES "routers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backup_schedules" ADD CONSTRAINT "backup_schedules_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backup_restores" ADD CONSTRAINT "backup_restores_backup_id_fkey" FOREIGN KEY ("backup_id") REFERENCES "router_backups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backup_restores" ADD CONSTRAINT "backup_restores_router_id_fkey" FOREIGN KEY ("router_id") REFERENCES "routers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
