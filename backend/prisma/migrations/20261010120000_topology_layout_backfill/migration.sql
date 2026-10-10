-- Backfill: create a TopologyLayout row for every existing company-owned router
-- so current topologies are unchanged at rollout (users then remove what they
-- don't want). Idempotent: skips rows that already exist.
INSERT INTO "topology_layouts" ("id", "router_id", "company_id", "position_x", "position_y", "created_at", "updated_at")
SELECT gen_random_uuid()::text, r."id", r."company_id", 400, 300, now(), now()
FROM "routers" r
WHERE r."company_id" IS NOT NULL
ON CONFLICT ("company_id", "router_id") DO NOTHING;
