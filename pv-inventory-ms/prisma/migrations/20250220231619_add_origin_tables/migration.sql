-- AlterTable
ALTER TABLE "branch_stocks" ADD COLUMN     "origin_branch_id" TEXT,
ALTER COLUMN "branch_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "warehouse_stocks" ADD COLUMN     "origin_warehouse_id" TEXT,
ALTER COLUMN "warehouse_id" DROP NOT NULL;
