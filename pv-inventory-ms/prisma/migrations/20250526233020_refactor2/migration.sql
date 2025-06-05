-- AlterTable
ALTER TABLE "inventory_movement_detail_suppliers" ALTER COLUMN "delivered_quantity" DROP NOT NULL,
ALTER COLUMN "delivered_quantity" DROP DEFAULT;

-- AlterTable
ALTER TABLE "inventory_movement_details" ALTER COLUMN "total_delivered_quantity" DROP NOT NULL,
ALTER COLUMN "total_delivered_quantity" DROP DEFAULT,
ALTER COLUMN "total_expected_quantity" DROP DEFAULT;
