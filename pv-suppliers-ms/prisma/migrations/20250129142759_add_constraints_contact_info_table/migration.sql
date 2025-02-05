/*
  Warnings:

  - You are about to drop the column `isPrimary` on the `contact_info` table. All the data in the column will be lost.
  - You are about to drop the column `phoneType` on the `contact_info` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[supplier_id,email]` on the table `contact_info` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[supplier_id,phone_number]` on the table `contact_info` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[supplier_id,is_primary]` on the table `contact_info` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "contact_info" DROP COLUMN "isPrimary",
DROP COLUMN "phoneType",
ADD COLUMN     "is_primary" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "phone_type" "PhoneType";

-- CreateIndex
CREATE UNIQUE INDEX "contact_info_supplier_id_email_key" ON "contact_info"("supplier_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "contact_info_supplier_id_phone_number_key" ON "contact_info"("supplier_id", "phone_number");

-- CreateIndex
CREATE UNIQUE INDEX "contact_info_supplier_id_is_primary_key" ON "contact_info"("supplier_id", "is_primary");
