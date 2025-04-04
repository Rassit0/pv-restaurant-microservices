-- CreateEnum
CREATE TYPE "ModuleType" AS ENUM ('USERS', 'REPORTS', 'INVENTORY', 'PRODUCTS', 'SETTINGS', 'BRANCHES', 'PRODUCTION', 'SUPPLIERS', 'WAREHOUSES');

-- CreateTable
CREATE TABLE "role_modules" (
    "role_id" TEXT NOT NULL,
    "module" "ModuleType" NOT NULL,

    CONSTRAINT "role_modules_pkey" PRIMARY KEY ("role_id","module")
);

-- AddForeignKey
ALTER TABLE "role_modules" ADD CONSTRAINT "role_modules_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
