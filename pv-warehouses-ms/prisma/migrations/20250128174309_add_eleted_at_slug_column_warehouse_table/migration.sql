/*
  Warnings:

  - Added the required column `slug` to the `warehouses` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "warehouses" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "slug" TEXT NOT NULL;
