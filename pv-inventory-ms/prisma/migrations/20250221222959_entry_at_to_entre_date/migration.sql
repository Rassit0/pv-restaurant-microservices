/*
  Warnings:

  - You are about to drop the column `entry_at` on the `inventory_transactions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "inventory_transactions" DROP COLUMN "entry_at",
ADD COLUMN     "entry_date" TIMESTAMP(3);
