-- AlterTable
ALTER TABLE "inventory_movement_detail_suppliers" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by_user_id" TEXT;
