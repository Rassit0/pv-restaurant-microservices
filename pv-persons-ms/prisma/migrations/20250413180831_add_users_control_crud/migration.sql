/*
  Warnings:

  - Added the required column `created_by_user_id` to the `persons` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_by_user_id` to the `persons` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "persons" ADD COLUMN     "created_by_user_id" TEXT NOT NULL,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by_user_id" TEXT,
ADD COLUMN     "updated_by_user_id" TEXT NOT NULL;
