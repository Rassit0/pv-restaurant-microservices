/*
  Warnings:

  - You are about to drop the `WarehouseAccess` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "WarehouseAccess" DROP CONSTRAINT "WarehouseAccess_warehouseId_fkey";

-- DropTable
DROP TABLE "WarehouseAccess";
