-- CreateEnum
CREATE TYPE "AdjustmentType" AS ENUM ('INCOME', 'OUTCOME');

-- CreateEnum
CREATE TYPE "StatusInventoryMovement" AS ENUM ('PENDING', 'ACCEPTED', 'CANCELED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "InventoryMovementType" AS ENUM ('INCOME', 'OUTCOME', 'TRANSFER', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "AdjustmentReason" AS ENUM ('DAMAGE', 'LOSS', 'AUDIT', 'EXCESS', 'OTHER');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'COMPLETE', 'PARTIAL', 'NOT_DELIVERED', 'OVER_DELIVERED');

-- CreateTable
CREATE TABLE "income" (
    "inventory_movement_id" TEXT NOT NULL,

    CONSTRAINT "income_pkey" PRIMARY KEY ("inventory_movement_id")
);

-- CreateTable
CREATE TABLE "outcome" (
    "inventory_movement_id" TEXT NOT NULL,

    CONSTRAINT "outcome_pkey" PRIMARY KEY ("inventory_movement_id")
);

-- CreateTable
CREATE TABLE "transfer" (
    "inventory_movement_id" TEXT NOT NULL,

    CONSTRAINT "transfer_pkey" PRIMARY KEY ("inventory_movement_id")
);

-- CreateTable
CREATE TABLE "adjustment" (
    "id" TEXT NOT NULL,
    "inventory_movement_id" TEXT NOT NULL,
    "adjustment_type" "AdjustmentType",
    "adjustment_reason" "AdjustmentReason",
    "other_adjustment_reason" TEXT,

    CONSTRAINT "adjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_movements" (
    "id" TEXT NOT NULL,
    "movement_type" "InventoryMovementType" NOT NULL,
    "status" "StatusInventoryMovement" NOT NULL DEFAULT 'PENDING',
    "description" TEXT,
    "created_by_user_id" TEXT NOT NULL,
    "updated_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delivery_date" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,
    "origin_branch_id" TEXT,
    "origin_warehouse_id" TEXT,
    "destination_branch_id" TEXT,
    "destination_warehouse_id" TEXT,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_movement_suppliers" (
    "id" TEXT NOT NULL,
    "inventory_movement_id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,

    CONSTRAINT "inventory_movement_suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_movement_delivery_managers" (
    "id" TEXT NOT NULL,
    "inventory_movement_id" TEXT NOT NULL,
    "delivery_manager_id" TEXT NOT NULL,

    CONSTRAINT "inventory_movement_delivery_managers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_movement_details" (
    "id" TEXT NOT NULL,
    "inventory_movement_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "unit" VARCHAR(20) NOT NULL,
    "expected_quantity" DECIMAL(10,2) NOT NULL,
    "delivered_quantity" DECIMAL(10,2) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "delivery_status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "inventory_movement_details_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "adjustment_inventory_movement_id_key" ON "adjustment"("inventory_movement_id");

-- CreateIndex
CREATE INDEX "inventory_movements_origin_branch_id_idx" ON "inventory_movements"("origin_branch_id");

-- CreateIndex
CREATE INDEX "inventory_movements_origin_warehouse_id_idx" ON "inventory_movements"("origin_warehouse_id");

-- CreateIndex
CREATE INDEX "inventory_movements_destination_branch_id_idx" ON "inventory_movements"("destination_branch_id");

-- CreateIndex
CREATE INDEX "inventory_movements_destination_warehouse_id_idx" ON "inventory_movements"("destination_warehouse_id");

-- CreateIndex
CREATE INDEX "inventory_movements_status_idx" ON "inventory_movements"("status");

-- CreateIndex
CREATE INDEX "inventory_movements_created_at_idx" ON "inventory_movements"("created_at");

-- CreateIndex
CREATE INDEX "inventory_movements_delivery_date_idx" ON "inventory_movements"("delivery_date");

-- CreateIndex
CREATE INDEX "inventory_movement_details_inventory_movement_id_product_id_idx" ON "inventory_movement_details"("inventory_movement_id", "product_id");

-- AddForeignKey
ALTER TABLE "income" ADD CONSTRAINT "income_inventory_movement_id_fkey" FOREIGN KEY ("inventory_movement_id") REFERENCES "inventory_movements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outcome" ADD CONSTRAINT "outcome_inventory_movement_id_fkey" FOREIGN KEY ("inventory_movement_id") REFERENCES "inventory_movements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer" ADD CONSTRAINT "transfer_inventory_movement_id_fkey" FOREIGN KEY ("inventory_movement_id") REFERENCES "inventory_movements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adjustment" ADD CONSTRAINT "adjustment_inventory_movement_id_fkey" FOREIGN KEY ("inventory_movement_id") REFERENCES "inventory_movements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movement_suppliers" ADD CONSTRAINT "inventory_movement_suppliers_inventory_movement_id_fkey" FOREIGN KEY ("inventory_movement_id") REFERENCES "inventory_movements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movement_delivery_managers" ADD CONSTRAINT "inventory_movement_delivery_managers_inventory_movement_id_fkey" FOREIGN KEY ("inventory_movement_id") REFERENCES "inventory_movements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movement_details" ADD CONSTRAINT "inventory_movement_details_inventory_movement_id_fkey" FOREIGN KEY ("inventory_movement_id") REFERENCES "inventory_movements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
