-- CreateEnum
CREATE TYPE "LinkType" AS ENUM ('ETHERNET', 'FIBER', 'WIRELESS', 'VPN');

-- CreateEnum
CREATE TYPE "LinkStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PLANNED');

-- CreateTable
CREATE TABLE "router_connections" (
    "id" TEXT NOT NULL,
    "source_router_id" TEXT NOT NULL,
    "target_router_id" TEXT NOT NULL,
    "linkType" "LinkType" NOT NULL DEFAULT 'ETHERNET',
    "linkStatus" "LinkStatus" NOT NULL DEFAULT 'ACTIVE',
    "source_interface" TEXT,
    "target_interface" TEXT,
    "bandwidth" TEXT,
    "distance" DECIMAL(10,2),
    "is_auto_discovered" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "router_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "router_connections_source_router_id_idx" ON "router_connections"("source_router_id");

-- CreateIndex
CREATE INDEX "router_connections_target_router_id_idx" ON "router_connections"("target_router_id");

-- CreateIndex
CREATE INDEX "router_connections_linkStatus_idx" ON "router_connections"("linkStatus");

-- CreateIndex
CREATE UNIQUE INDEX "router_connections_source_router_id_target_router_id_source_key" ON "router_connections"("source_router_id", "target_router_id", "source_interface", "target_interface");

-- AddForeignKey
ALTER TABLE "router_connections" ADD CONSTRAINT "router_connections_source_router_id_fkey" FOREIGN KEY ("source_router_id") REFERENCES "routers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "router_connections" ADD CONSTRAINT "router_connections_target_router_id_fkey" FOREIGN KEY ("target_router_id") REFERENCES "routers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
