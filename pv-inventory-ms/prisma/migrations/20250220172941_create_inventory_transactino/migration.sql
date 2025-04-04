-- CreateEnum
CREATE TYPE "InventoryMovementType" AS ENUM ('INCOME', 'OUTCOME', 'ADJUSTMENT', 'TRANSFER');

-- CreateEnum
CREATE TYPE "ReferenceType" AS ENUM ('STOCK_ADJUSTMENT', 'WAREHOUSE_TO_BRANCH', 'BRANCH_TO_WAREHOUSE', 'WAREHOUSE_TRANSFER', 'BRANCH_TRANSFER', 'DIRECT_INCOME');

-- CreateTable
CREATE TABLE "inventory_transactions" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "movement_type" "InventoryMovementType" NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit" VARCHAR(20) NOT NULL,
    "branch_id" TEXT,
    "warehouse_id" TEXT,
    "reference_id" TEXT,
    "reference_type" "ReferenceType",
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branch_stocks" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "stock" DECIMAL(10,2) NOT NULL,
    "unit" VARCHAR(20) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branch_stocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse_stocks" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "stock" DECIMAL(10,2) NOT NULL,
    "unit" VARCHAR(20) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouse_stocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inventory_transactions_product_id_idx" ON "inventory_transactions"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "branch_stocks_product_id_branch_id_key" ON "branch_stocks"("product_id", "branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "warehouse_stocks_product_id_warehouse_id_key" ON "warehouse_stocks"("product_id", "warehouse_id");
