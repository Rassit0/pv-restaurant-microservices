/*
  Warnings:

  - You are about to drop the `supplier_products` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "supplier_products" DROP CONSTRAINT "supplier_products_product_id_fkey";

-- DropTable
DROP TABLE "supplier_products";
