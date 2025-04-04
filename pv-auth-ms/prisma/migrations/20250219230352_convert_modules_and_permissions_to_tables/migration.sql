/*
  Warnings:

  - The primary key for the `role_module_permissions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `permission` on the `role_module_permissions` table. All the data in the column will be lost.
  - You are about to drop the column `module` on the `role_modules` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[role_id,module_id]` on the table `role_modules` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `permission_id` to the `role_module_permissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `module_id` to the `role_modules` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "role_modules_role_id_module_key";

-- AlterTable
ALTER TABLE "role_module_permissions" DROP CONSTRAINT "role_module_permissions_pkey",
DROP COLUMN "permission",
ADD COLUMN     "permission_id" TEXT NOT NULL,
ADD CONSTRAINT "role_module_permissions_pkey" PRIMARY KEY ("role_module_id", "permission_id");

-- AlterTable
ALTER TABLE "role_modules" DROP COLUMN "module",
ADD COLUMN     "module_id" TEXT NOT NULL;

-- DropEnum
DROP TYPE "ModuleType";

-- CreateTable
CREATE TABLE "modules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parent_module_id" TEXT,

    CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "modules_name_key" ON "modules"("name");

-- CreateIndex
CREATE UNIQUE INDEX "role_modules_role_id_module_id_key" ON "role_modules"("role_id", "module_id");

-- AddForeignKey
ALTER TABLE "modules" ADD CONSTRAINT "modules_parent_module_id_fkey" FOREIGN KEY ("parent_module_id") REFERENCES "modules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_modules" ADD CONSTRAINT "role_modules_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_module_permissions" ADD CONSTRAINT "role_module_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
