/*
  Warnings:

  - You are about to drop the column `type` on the `products` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "ProductType" ADD VALUE 'Recipe';

-- AlterTable
ALTER TABLE "products" DROP COLUMN "type";

-- CreateTable
CREATE TABLE "type_products" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "ProductType" NOT NULL,

    CONSTRAINT "type_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipes" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_enable" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_products" (
    "id" TEXT NOT NULL,
    "recipe_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit_id" TEXT NOT NULL,

    CONSTRAINT "recipe_products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "type_products_productId_type_key" ON "type_products"("productId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "recipes_name_key" ON "recipes"("name");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_products_recipe_id_product_id_key" ON "recipe_products"("recipe_id", "product_id");

-- AddForeignKey
ALTER TABLE "type_products" ADD CONSTRAINT "type_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_products" ADD CONSTRAINT "recipe_products_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_products" ADD CONSTRAINT "recipe_products_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_products" ADD CONSTRAINT "recipe_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
