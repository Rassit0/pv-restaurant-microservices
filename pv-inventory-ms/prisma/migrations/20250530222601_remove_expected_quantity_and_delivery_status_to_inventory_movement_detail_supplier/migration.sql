/*
  Warnings:

  - You are about to drop the column `delivery_status` on the `inventory_movement_detail_suppliers` table. All the data in the column will be lost.
  - You are about to drop the column `expected_quantity` on the `inventory_movement_detail_suppliers` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "inventory_movement_detail_suppliers" DROP COLUMN "delivery_status",
DROP COLUMN "expected_quantity";
