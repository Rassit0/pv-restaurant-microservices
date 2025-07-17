/*
  Warnings:

  - You are about to drop the `branch_product_stock` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `warehouse_product_stock` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('BRANCH', 'WAREHOUSE');

-- DropForeignKey
ALTER TABLE "branch_product_stock" DROP CONSTRAINT "branch_product_stock_product_id_fkey";

-- DropForeignKey
ALTER TABLE "warehouse_product_stock" DROP CONSTRAINT "warehouse_product_stock_product_id_fkey";

-- DropTable
DROP TABLE "branch_product_stock";

-- DropTable
DROP TABLE "warehouse_product_stock";

-- CreateTable
CREATE TABLE "location_product_stock" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "location_type" "LocationType" NOT NULL,
    "stock" DECIMAL(10,2) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "location_product_stock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "location_product_stock_product_id_location_id_location_type_key" ON "location_product_stock"("product_id", "location_id", "location_type");

-- AddForeignKey
ALTER TABLE "location_product_stock" ADD CONSTRAINT "location_product_stock_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
