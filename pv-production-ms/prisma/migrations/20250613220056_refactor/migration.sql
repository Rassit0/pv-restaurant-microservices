/*
  Warnings:

  - You are about to drop the `canceled_production_waste` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "WasteReason" AS ENUM ('DAMAGED', 'EXPIRED', 'RETURNED', 'OVERPRODUCTION', 'CANCELED', 'OTHER');

-- DropForeignKey
ALTER TABLE "canceled_production_waste" DROP CONSTRAINT "canceled_production_waste_production_order_id_fkey";

-- DropTable
DROP TABLE "canceled_production_waste";

-- CreateTable
CREATE TABLE "production_waste" (
    "id" TEXT NOT NULL,
    "production_order_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "reason" "WasteReason" NOT NULL,
    "reasonDescription" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "production_waste_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "production_waste" ADD CONSTRAINT "production_waste_production_order_id_fkey" FOREIGN KEY ("production_order_id") REFERENCES "production_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
