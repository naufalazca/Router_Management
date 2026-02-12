-- CreateEnum
CREATE TYPE "RouterType" AS ENUM ('UPSTREAM', 'CORE', 'DISTRIBUSI', 'WIRELESS');

-- CreateEnum
CREATE TYPE "RouterBrand" AS ENUM ('MIKROTIK', 'UBIVIQUITI');

-- AlterTable
ALTER TABLE "routers" ADD COLUMN     "router_brand" "RouterBrand" NOT NULL DEFAULT 'MIKROTIK',
ADD COLUMN     "router_type" "RouterType" NOT NULL DEFAULT 'CORE';
