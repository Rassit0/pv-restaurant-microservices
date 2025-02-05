/*
  Warnings:

  - You are about to drop the column `minimun_stock` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `reorder_point` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `stock` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `stock_location` on the `products` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "products" DROP COLUMN "minimun_stock",
DROP COLUMN "reorder_point",
DROP COLUMN "stock",
DROP COLUMN "stock_location";

-- CreateTable
CREATE TABLE "product_branch_stock" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "stock" DECIMAL(10,2) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "minimun_stock" DECIMAL(10,2) NOT NULL,
    "reorder_point" DECIMAL(10,2) NOT NULL,
    "stock_location" TEXT,
    "last_stock_update" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_branch_stock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_branch_stock_product_id_branch_id_key" ON "product_branch_stock"("product_id", "branch_id");

-- AddForeignKey
ALTER TABLE "product_branch_stock" ADD CONSTRAINT "product_branch_stock_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
