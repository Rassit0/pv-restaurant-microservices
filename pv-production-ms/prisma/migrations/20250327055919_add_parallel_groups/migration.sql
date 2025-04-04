/*
  Warnings:

  - You are about to drop the column `parallel_group` on the `production_details` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "production_details" DROP COLUMN "parallel_group",
ADD COLUMN     "parallel_group_id" TEXT;

-- CreateTable
CREATE TABLE "parallel_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parallel_groups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "parallel_groups_name_key" ON "parallel_groups"("name");

-- AddForeignKey
ALTER TABLE "production_details" ADD CONSTRAINT "production_details_parallel_group_id_fkey" FOREIGN KEY ("parallel_group_id") REFERENCES "parallel_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
