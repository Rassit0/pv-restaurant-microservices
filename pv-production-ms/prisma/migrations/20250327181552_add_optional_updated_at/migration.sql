-- AlterTable
ALTER TABLE "production_orders" ALTER COLUMN "updated_at" DROP NOT NULL,
ALTER COLUMN "updated_by_user_id" DROP NOT NULL;
