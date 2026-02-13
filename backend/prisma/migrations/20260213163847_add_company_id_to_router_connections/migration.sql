-- DropIndex
DROP INDEX "router_connections_source_router_id_target_router_id_source_key";

-- AlterTable
ALTER TABLE "router_connections" ADD COLUMN     "company_id" TEXT;

-- CreateIndex
CREATE INDEX "router_connections_company_id_idx" ON "router_connections"("company_id");

-- AddForeignKey
ALTER TABLE "router_connections" ADD CONSTRAINT "router_connections_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
