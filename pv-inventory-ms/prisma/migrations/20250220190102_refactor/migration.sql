/*
  Warnings:

  - You are about to drop the column `product_id` on the `branch_stocks` table. All the data in the column will be lost.
  - You are about to drop the column `unit` on the `branch_stocks` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `inventory_transaction_products` table. All the data in the column will be lost.
  - You are about to drop the column `product_id` on the `warehouse_stocks` table. All the data in the column will be lost.
  - You are about to drop the column `unit` on the `warehouse_stocks` table. All the data in the column will be lost.
  - Added the required column `updated_by_user_id` to the `inventory_transactions` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "StatusInventoryTransaction" AS ENUM ('PENDING', 'ACCEPTED', 'CANCELED', 'COMPLETED');

-- DropIndex
DROP INDEX "branch_stocks_product_id_branch_id_key";

-- DropIndex
DROP INDEX "warehouse_stocks_product_id_warehouse_id_key";

-- AlterTable
ALTER TABLE "branch_stocks" DROP COLUMN "product_id",
DROP COLUMN "unit";

-- AlterTable
ALTER TABLE "inventory_transaction_products" DROP COLUMN "quantity";

-- AlterTable
ALTER TABLE "inventory_transactions" ADD COLUMN     "status" "StatusInventoryTransaction" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "updated_by_user_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "warehouse_stocks" DROP COLUMN "product_id",
DROP COLUMN "unit";
