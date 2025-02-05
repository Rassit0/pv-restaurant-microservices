/*
  Warnings:

  - You are about to drop the `product_branch_stock` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "product_branch_stock" DROP CONSTRAINT "product_branch_stock_product_id_fkey";

-- DropTable
DROP TABLE "product_branch_stock";

-- CreateTable
CREATE TABLE "branch_product_inventory" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "stock" DECIMAL(10,2) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "minimun_stock" DECIMAL(10,2) NOT NULL,
    "reorder_point" DECIMAL(10,2) NOT NULL,
    "stock_location" TEXT,
    "last_stock_update" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "purchasePriceOverride" DECIMAL(10,2),

    CONSTRAINT "branch_product_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "branch_product_inventory_product_id_branch_id_key" ON "branch_product_inventory"("product_id", "branch_id");

-- AddForeignKey
ALTER TABLE "branch_product_inventory" ADD CONSTRAINT "branch_product_inventory_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
