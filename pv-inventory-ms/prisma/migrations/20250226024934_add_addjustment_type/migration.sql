-- CreateEnum
CREATE TYPE "AdjustmentType" AS ENUM ('INCOME', 'OUTCOME');

-- AlterTable
ALTER TABLE "inventory_transactions" ADD COLUMN     "adjustment_type" "AdjustmentType";
