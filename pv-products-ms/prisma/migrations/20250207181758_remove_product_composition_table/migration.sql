/*
  Warnings:

  - You are about to drop the `composes_products` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "composes_products" DROP CONSTRAINT "composes_products_component_product_id_fkey";

-- DropForeignKey
ALTER TABLE "composes_products" DROP CONSTRAINT "composes_products_product_id_fkey";

-- DropTable
DROP TABLE "composes_products";
