-- CreateTable
CREATE TABLE "switches" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "mac_address" TEXT,
    "model" TEXT,
    "location" TEXT,
    "port_count" INTEGER,
    "status" "RouterStatus" NOT NULL DEFAULT 'ACTIVE',
    "router_brand" "RouterBrand" NOT NULL DEFAULT 'MIKROTIK',
    "company_id" TEXT NOT NULL,
    "username" TEXT NOT NULL DEFAULT 'admin',
    "password" TEXT NOT NULL DEFAULT '',
    "api_port" INTEGER DEFAULT 8728,
    "ssh_port" INTEGER DEFAULT 22,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "switches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "switch_connections" (
    "id" TEXT NOT NULL,
    "source_switch_id" TEXT,
    "source_router_id" TEXT,
    "target_switch_id" TEXT,
    "target_router_id" TEXT,
    "company_id" TEXT,
    "linkType" "LinkType" NOT NULL DEFAULT 'ETHERNET',
    "linkStatus" "LinkStatus" NOT NULL DEFAULT 'ACTIVE',
    "source_interface" TEXT,
    "target_interface" TEXT,
    "source_port_number" INTEGER,
    "target_port_number" INTEGER,
    "vlan" INTEGER,
    "speed" TEXT,
    "bandwidth" TEXT,
    "distance" DECIMAL(10,2),
    "is_auto_discovered" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "switch_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "switch_topology_layouts" (
    "id" TEXT NOT NULL,
    "switch_id" TEXT NOT NULL,
    "company_id" TEXT,
    "position_x" DECIMAL(10,2) NOT NULL,
    "position_y" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "switch_topology_layouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "switches_company_id_idx" ON "switches"("company_id");

-- CreateIndex
CREATE INDEX "switch_connections_source_switch_id_idx" ON "switch_connections"("source_switch_id");

-- CreateIndex
CREATE INDEX "switch_connections_source_router_id_idx" ON "switch_connections"("source_router_id");

-- CreateIndex
CREATE INDEX "switch_connections_target_switch_id_idx" ON "switch_connections"("target_switch_id");

-- CreateIndex
CREATE INDEX "switch_connections_target_router_id_idx" ON "switch_connections"("target_router_id");

-- CreateIndex
CREATE INDEX "switch_connections_company_id_idx" ON "switch_connections"("company_id");

-- CreateIndex
CREATE INDEX "switch_connections_linkStatus_idx" ON "switch_connections"("linkStatus");

-- CreateIndex
CREATE INDEX "switch_topology_layouts_company_id_idx" ON "switch_topology_layouts"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "switch_topology_layouts_company_id_switch_id_key" ON "switch_topology_layouts"("company_id", "switch_id");

-- AddForeignKey
ALTER TABLE "switches" ADD CONSTRAINT "switches_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "switch_connections" ADD CONSTRAINT "switch_connections_source_switch_id_fkey" FOREIGN KEY ("source_switch_id") REFERENCES "switches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "switch_connections" ADD CONSTRAINT "switch_connections_source_router_id_fkey" FOREIGN KEY ("source_router_id") REFERENCES "routers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "switch_connections" ADD CONSTRAINT "switch_connections_target_switch_id_fkey" FOREIGN KEY ("target_switch_id") REFERENCES "switches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "switch_connections" ADD CONSTRAINT "switch_connections_target_router_id_fkey" FOREIGN KEY ("target_router_id") REFERENCES "routers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "switch_connections" ADD CONSTRAINT "switch_connections_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "switch_topology_layouts" ADD CONSTRAINT "switch_topology_layouts_switch_id_fkey" FOREIGN KEY ("switch_id") REFERENCES "switches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "switch_topology_layouts" ADD CONSTRAINT "switch_topology_layouts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Hand-added CHECK constraint (Prisma cannot express this in the schema).
-- NOTE: a future `prisma migrate dev` regeneration could drop this — re-add if lost.
-- Enforces that each switch connection has exactly one source endpoint and one target endpoint.
ALTER TABLE "switch_connections"
  ADD CONSTRAINT "switch_connections_two_endpoints_check"
  CHECK (
    (("source_switch_id" IS NOT NULL)::int + ("source_router_id" IS NOT NULL)::int) = 1
    AND
    (("target_switch_id" IS NOT NULL)::int + ("target_router_id" IS NOT NULL)::int) = 1
  );
