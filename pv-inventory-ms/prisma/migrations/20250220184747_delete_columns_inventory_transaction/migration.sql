/*
  Warnings:

  - You are about to drop the column `branch_id` on the `inventory_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `reference_id` on the `inventory_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `warehouse_id` on the `inventory_transactions` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "inventory_transactions_branch_id_warehouse_id_idx";

-- AlterTable
ALTER TABLE "inventory_transactions" DROP COLUMN "branch_id",
DROP COLUMN "reference_id",
DROP COLUMN "warehouse_id";

-- CreateIndex
CREATE INDEX "inventory_transaction_products_inventory_transaction_id_pro_idx" ON "inventory_transaction_products"("inventory_transaction_id", "product_id");

-- CreateIndex
CREATE INDEX "inventory_transactions_movement_type_idx" ON "inventory_transactions"("movement_type");
