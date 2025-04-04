/*
  Warnings:

  - Added the required column `sub_total_time` to the `production_details` table without a default value. This is not possible if the table is not empty.
  - Added the required column `total_time` to the `production_orders` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "production_details" ADD COLUMN     "sub_total_time" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "production_orders" ADD COLUMN     "total_time" INTEGER NOT NULL;
