/*
  Warnings:

  - You are about to drop the column `user_id` on the `branches` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "branches" DROP COLUMN "user_id",
ADD COLUMN     "manager_id" TEXT;
