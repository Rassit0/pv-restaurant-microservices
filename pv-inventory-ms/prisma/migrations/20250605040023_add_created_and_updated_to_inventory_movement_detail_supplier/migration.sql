/*
  Warnings:

  - Added the required column `created_by_user_id` to the `inventory_movement_detail_suppliers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `inventory_movement_detail_suppliers` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "inventory_movement_detail_suppliers" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "created_by_user_id" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updated_by_user_id" TEXT;
