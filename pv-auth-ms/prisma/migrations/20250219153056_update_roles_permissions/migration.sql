/*
  Warnings:

  - The primary key for the `role_modules` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the `role_permissions` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[role_id,module]` on the table `role_modules` will be added. If there are existing duplicate values, this will fail.
  - The required column `id` was added to the `role_modules` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- DropForeignKey
ALTER TABLE "role_permissions" DROP CONSTRAINT "role_permissions_permission_id_fkey";

-- DropForeignKey
ALTER TABLE "role_permissions" DROP CONSTRAINT "role_permissions_role_id_fkey";

-- AlterTable
ALTER TABLE "role_modules" DROP CONSTRAINT "role_modules_pkey",
ADD COLUMN     "id" TEXT NOT NULL,
ADD CONSTRAINT "role_modules_pkey" PRIMARY KEY ("id");

-- DropTable
DROP TABLE "role_permissions";

-- CreateTable
CREATE TABLE "role_module_permissions" (
    "role_module_id" TEXT NOT NULL,
    "permission" "PermissionType" NOT NULL,

    CONSTRAINT "role_module_permissions_pkey" PRIMARY KEY ("role_module_id","permission")
);

-- CreateIndex
CREATE UNIQUE INDEX "role_modules_role_id_module_key" ON "role_modules"("role_id", "module");

-- AddForeignKey
ALTER TABLE "role_module_permissions" ADD CONSTRAINT "role_module_permissions_role_module_id_fkey" FOREIGN KEY ("role_module_id") REFERENCES "role_modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
