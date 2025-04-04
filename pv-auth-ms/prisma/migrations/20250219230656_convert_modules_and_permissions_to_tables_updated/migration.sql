/*
  Warnings:

  - Changed the type of `name` on the `permissions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "permissions" DROP COLUMN "name",
ADD COLUMN     "name" TEXT NOT NULL;

-- DropEnum
DROP TYPE "PermissionType";

-- CreateIndex
CREATE UNIQUE INDEX "permissions_name_key" ON "permissions"("name");
