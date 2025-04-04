-- AlterTable
ALTER TABLE "production_details" ADD COLUMN     "is_parallel" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parallel_group" TEXT;
