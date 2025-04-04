/*
  Warnings:

  - You are about to drop the column `reference_type` on the `inventory_movements` table. All the data in the column will be lost.
  - The `status` column on the `inventory_movements` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `inventory_transaction_products` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "StatusInventoryMovement" AS ENUM ('PENDING', 'ACCEPTED', 'CANCELED', 'COMPLETED');

-- DropForeignKey
ALTER TABLE "inventory_transaction_products" DROP CONSTRAINT "inventory_transaction_products_branch_stock_id_fkey";

-- DropForeignKey
ALTER TABLE "inventory_transaction_products" DROP CONSTRAINT "inventory_transaction_products_inventory_transaction_id_fkey";

-- DropForeignKey
ALTER TABLE "inventory_transaction_products" DROP CONSTRAINT "inventory_transaction_products_warehouse_stock_id_fkey";

-- AlterTable
ALTER TABLE "inventory_movements" DROP COLUMN "reference_type",
DROP COLUMN "status",
ADD COLUMN     "status" "StatusInventoryMovement" NOT NULL DEFAULT 'PENDING';

-- DropTable
DROP TABLE "inventory_transaction_products";

-- DropEnum
DROP TYPE "ReferenceType";

-- DropEnum
DROP TYPE "StatusInventoryTransaction";

-- CreateTable
CREATE TABLE "inventory_movement_products" (
    "id" TEXT NOT NULL,
    "inventory_movement_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "unit" VARCHAR(20) NOT NULL,
    "branch_stock_id" TEXT,
    "warehouse_stock_id" TEXT,

    CONSTRAINT "inventory_movement_products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inventory_movement_products_inventory_movement_id_product_i_idx" ON "inventory_movement_products"("inventory_movement_id", "product_id");

-- AddForeignKey
ALTER TABLE "inventory_movement_products" ADD CONSTRAINT "inventory_movement_products_inventory_movement_id_fkey" FOREIGN KEY ("inventory_movement_id") REFERENCES "inventory_movements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movement_products" ADD CONSTRAINT "inventory_movement_products_branch_stock_id_fkey" FOREIGN KEY ("branch_stock_id") REFERENCES "branch_stocks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movement_products" ADD CONSTRAINT "inventory_movement_products_warehouse_stock_id_fkey" FOREIGN KEY ("warehouse_stock_id") REFERENCES "warehouse_stocks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
