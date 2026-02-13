-- CreateTable
CREATE TABLE "topology_layouts" (
    "id" TEXT NOT NULL,
    "router_id" TEXT NOT NULL,
    "company_id" TEXT,
    "position_x" DECIMAL(10,2) NOT NULL,
    "position_y" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "topology_layouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "topology_layouts_company_id_idx" ON "topology_layouts"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "topology_layouts_company_id_router_id_key" ON "topology_layouts"("company_id", "router_id");

-- AddForeignKey
ALTER TABLE "topology_layouts" ADD CONSTRAINT "topology_layouts_router_id_fkey" FOREIGN KEY ("router_id") REFERENCES "routers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topology_layouts" ADD CONSTRAINT "topology_layouts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
