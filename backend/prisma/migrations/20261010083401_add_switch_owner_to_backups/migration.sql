-- AlterTable
ALTER TABLE "backup_restores" ADD COLUMN     "switch_id" TEXT,
ALTER COLUMN "router_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "router_backups" ADD COLUMN     "switch_id" TEXT,
ALTER COLUMN "router_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "backup_restores_switch_id_idx" ON "backup_restores"("switch_id");

-- CreateIndex
CREATE INDEX "router_backups_switch_id_created_at_idx" ON "router_backups"("switch_id", "created_at");

-- AddForeignKey
ALTER TABLE "router_backups" ADD CONSTRAINT "router_backups_switch_id_fkey" FOREIGN KEY ("switch_id") REFERENCES "switches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backup_restores" ADD CONSTRAINT "backup_restores_switch_id_fkey" FOREIGN KEY ("switch_id") REFERENCES "switches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
