/*
  Warnings:

  - Made the column `updated_at` on table `production_orders` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_by_user_id` on table `production_orders` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "production_orders" ALTER COLUMN "updated_at" SET NOT NULL,
ALTER COLUMN "updated_by_user_id" SET NOT NULL;
