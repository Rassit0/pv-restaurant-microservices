/*
  Warnings:

  - You are about to drop the column `stock_location` on the `branch_product_inventory` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "branch_product_inventory" DROP COLUMN "stock_location",
ADD COLUMN     "warehouse_id" TEXT;
