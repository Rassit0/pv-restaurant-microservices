-- AlterTable
ALTER TABLE "branch_stocks" ADD COLUMN     "origin_warehouse_id" TEXT;

-- AlterTable
ALTER TABLE "warehouse_stocks" ADD COLUMN     "origin_branch_id" TEXT;
