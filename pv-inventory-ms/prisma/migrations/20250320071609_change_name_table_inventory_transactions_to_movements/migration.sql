/*
  Warnings:

  - You are about to drop the `inventory_transactions` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "inventory_transaction_products" DROP CONSTRAINT "inventory_transaction_products_inventory_transaction_id_fkey";

-- DropTable
DROP TABLE "inventory_transactions";

-- CreateTable
CREATE TABLE "inventory_movements" (
    "id" TEXT NOT NULL,
    "movement_type" "InventoryMovementType" NOT NULL,
    "adjustment_type" "AdjustmentType",
    "reference_type" "ReferenceType",
    "status" "StatusInventoryTransaction" NOT NULL DEFAULT 'PENDING',
    "description" TEXT,
    "created_by_user_id" TEXT NOT NULL,
    "updated_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entry_date" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inventory_movements_movement_type_idx" ON "inventory_movements"("movement_type");

-- AddForeignKey
ALTER TABLE "inventory_transaction_products" ADD CONSTRAINT "inventory_transaction_products_inventory_transaction_id_fkey" FOREIGN KEY ("inventory_transaction_id") REFERENCES "inventory_movements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
