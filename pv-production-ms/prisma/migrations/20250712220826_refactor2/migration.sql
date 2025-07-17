/*
  Warnings:

  - You are about to drop the column `branch_id` on the `production_orders` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "production_orders" DROP COLUMN "branch_id",
ADD COLUMN     "origin_branch_id" TEXT;
