-- CreateEnum
CREATE TYPE "SupplierType" AS ENUM ('INDIVIDUAL', 'COMPANY');

-- AlterTable
ALTER TABLE "suppliers" ADD COLUMN     "person_id" TEXT,
ADD COLUMN     "type" "SupplierType" NOT NULL DEFAULT 'COMPANY';
