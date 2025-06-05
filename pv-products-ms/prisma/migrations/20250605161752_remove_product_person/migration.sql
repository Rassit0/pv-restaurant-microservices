/*
  Warnings:

  - You are about to drop the `person_suppliers` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "person_suppliers" DROP CONSTRAINT "person_suppliers_product_id_fkey";

-- DropTable
DROP TABLE "person_suppliers";
