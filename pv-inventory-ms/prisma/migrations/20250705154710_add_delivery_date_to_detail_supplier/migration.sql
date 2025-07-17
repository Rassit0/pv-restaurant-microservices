/*
  Warnings:

  - You are about to drop the column `delivery_date` on the `inventory_movements` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "inventory_movements_delivery_date_idx";

-- AlterTable
ALTER TABLE "inventory_movement_detail_suppliers" ADD COLUMN     "delivery_date" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "inventory_movements" DROP COLUMN "delivery_date",
ADD COLUMN     "general_delivery_date" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "inventory_movements_general_delivery_date_idx" ON "inventory_movements"("general_delivery_date");
