/*
  Warnings:

  - The values [PRODUCTINO_RECIPES] on the enum `ModuleType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ModuleType_new" AS ENUM ('USERS', 'REPORTS', 'INVENTORY', 'INVENTORY_EXIT', 'INVENTORY_ENTRY', 'PRODUCTS', 'SETTINGS', 'BRANCHES', 'PRODUCTION', 'SUPPLIERS', 'WAREHOUSES', 'HOME', 'SUPPLIERS_CONTACTS', 'PRODUCTION_RECIPES');
ALTER TABLE "role_modules" ALTER COLUMN "module" TYPE "ModuleType_new" USING ("module"::text::"ModuleType_new");
ALTER TYPE "ModuleType" RENAME TO "ModuleType_old";
ALTER TYPE "ModuleType_new" RENAME TO "ModuleType";
DROP TYPE "ModuleType_old";
COMMIT;
