/*
  Warnings:

  - You are about to drop the column `contact_name` on the `suppliers` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `suppliers` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `suppliers` table. All the data in the column will be lost.
  - You are about to drop the `phones` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ContactPosition" AS ENUM ('SALES', 'SUPPORT', 'MANAGER', 'ADMINISTRATOR', 'OTHER');

-- DropForeignKey
ALTER TABLE "phones" DROP CONSTRAINT "phones_supplier_id_fkey";

-- DropIndex
DROP INDEX "suppliers_email_key";

-- AlterTable
ALTER TABLE "suppliers" DROP COLUMN "contact_name",
DROP COLUMN "email",
DROP COLUMN "phone";

-- DropTable
DROP TABLE "phones";

-- CreateTable
CREATE TABLE "contact_info" (
    "id" SERIAL NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "contact_name" TEXT NOT NULL,
    "email" TEXT,
    "phone_number" TEXT,
    "phoneType" "PhoneType",
    "position" "ContactPosition" NOT NULL DEFAULT 'OTHER',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_info_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contact_info_email_key" ON "contact_info"("email");

-- AddForeignKey
ALTER TABLE "contact_info" ADD CONSTRAINT "contact_info_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
