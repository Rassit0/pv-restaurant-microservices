/*
  Warnings:

  - You are about to drop the column `stock` on the `branch_stocks` table. All the data in the column will be lost.
  - You are about to drop the column `product_id` on the `inventory_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `inventory_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `unit` on the `inventory_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `stock` on the `warehouse_stocks` table. All the data in the column will be lost.
  - Added the required column `quantity` to the `branch_stocks` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quantity` to the `warehouse_stocks` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "inventory_transactions_product_id_idx";

-- AlterTable
ALTER TABLE "branch_stocks" DROP COLUMN "stock",
ADD COLUMN     "quantity" DECIMAL(10,2) NOT NULL;

-- AlterTable
ALTER TABLE "inventory_transactions" DROP COLUMN "product_id",
DROP COLUMN "quantity",
DROP COLUMN "unit";

-- AlterTable
ALTER TABLE "warehouse_stocks" DROP COLUMN "stock",
ADD COLUMN     "quantity" DECIMAL(10,2) NOT NULL;

-- CreateTable
CREATE TABLE "inventory_transaction_products" (
    "id" TEXT NOT NULL,
    "inventory_transaction_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit" VARCHAR(20) NOT NULL,
    "branch_stock_id" TEXT,
    "warehouse_stock_id" TEXT,

    CONSTRAINT "inventory_transaction_products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inventory_transactions_branch_id_warehouse_id_idx" ON "inventory_transactions"("branch_id", "warehouse_id");

-- AddForeignKey
ALTER TABLE "inventory_transaction_products" ADD CONSTRAINT "inventory_transaction_products_inventory_transaction_id_fkey" FOREIGN KEY ("inventory_transaction_id") REFERENCES "inventory_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transaction_products" ADD CONSTRAINT "inventory_transaction_products_branch_stock_id_fkey" FOREIGN KEY ("branch_stock_id") REFERENCES "branch_stocks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transaction_products" ADD CONSTRAINT "inventory_transaction_products_warehouse_stock_id_fkey" FOREIGN KEY ("warehouse_stock_id") REFERENCES "warehouse_stocks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
