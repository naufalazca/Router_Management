-- AlterTable
ALTER TABLE "routers" ADD COLUMN     "api_port" INTEGER DEFAULT 8728,
ADD COLUMN     "password" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "username" TEXT NOT NULL DEFAULT 'admin';
