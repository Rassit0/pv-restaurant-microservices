/*
  Warnings:

  - Made the column `general_delivery_date` on table `inventory_movements` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "inventory_movements" ALTER COLUMN "general_delivery_date" SET NOT NULL;
