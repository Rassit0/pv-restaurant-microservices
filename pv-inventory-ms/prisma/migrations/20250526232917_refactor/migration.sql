/*
  Warnings:

  - Added the required column `expected_quantity` to the `inventory_movement_detail_suppliers` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "inventory_movement_detail_suppliers" ADD COLUMN     "expected_quantity" DECIMAL(10,2) NOT NULL;
