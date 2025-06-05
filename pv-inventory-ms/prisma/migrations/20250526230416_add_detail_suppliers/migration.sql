/*
  Warnings:

  - You are about to drop the column `delivered_quantity` on the `inventory_movement_details` table. All the data in the column will be lost.
  - You are about to drop the column `expected_quantity` on the `inventory_movement_details` table. All the data in the column will be lost.
  - You are about to drop the `inventory_movement_delivery_managers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `inventory_movement_suppliers` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "inventory_movement_delivery_managers" DROP CONSTRAINT "inventory_movement_delivery_managers_inventory_movement_id_fkey";

-- DropForeignKey
ALTER TABLE "inventory_movement_suppliers" DROP CONSTRAINT "inventory_movement_suppliers_inventory_movement_id_fkey";

-- AlterTable
ALTER TABLE "inventory_movement_details" DROP COLUMN "delivered_quantity",
DROP COLUMN "expected_quantity",
ADD COLUMN     "total_delivered_quantity" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "total_expected_quantity" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "inventory_movement_delivery_managers";

-- DropTable
DROP TABLE "inventory_movement_suppliers";

-- CreateTable
CREATE TABLE "inventory_movement_detail_suppliers" (
    "id" TEXT NOT NULL,
    "inventory_movement_detail_id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "delivered_quantity" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "delivery_status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "inventory_movement_detail_suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inventory_movement_detail_suppliers_supplier_id_idx" ON "inventory_movement_detail_suppliers"("supplier_id");

-- CreateIndex
CREATE UNIQUE INDEX "imd_supplier_unique" ON "inventory_movement_detail_suppliers"("inventory_movement_detail_id", "supplier_id");

-- AddForeignKey
ALTER TABLE "inventory_movement_detail_suppliers" ADD CONSTRAINT "inventory_movement_detail_suppliers_inventory_movement_det_fkey" FOREIGN KEY ("inventory_movement_detail_id") REFERENCES "inventory_movement_details"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
