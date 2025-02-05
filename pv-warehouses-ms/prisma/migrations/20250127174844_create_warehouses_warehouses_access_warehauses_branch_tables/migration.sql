-- CreateEnum
CREATE TYPE "WarehouseRole" AS ENUM ('ADMIN', 'SUPERVISOR', 'OPERATOR', 'READER');

-- CreateTable
CREATE TABLE "warehouses" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "location" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "imageUrl" TEXT,
    "managerId" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarehouseAccess" (
    "id" SERIAL NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "WarehouseRole" NOT NULL DEFAULT 'OPERATOR',

    CONSTRAINT "WarehouseAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse_branch" (
    "warehouseId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,

    CONSTRAINT "warehouse_branch_pkey" PRIMARY KEY ("warehouseId","branchId")
);

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_name_key" ON "warehouses"("name");

-- CreateIndex
CREATE UNIQUE INDEX "WarehouseAccess_warehouseId_userId_key" ON "WarehouseAccess"("warehouseId", "userId");

-- AddForeignKey
ALTER TABLE "WarehouseAccess" ADD CONSTRAINT "WarehouseAccess_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_branch" ADD CONSTRAINT "warehouse_branch_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
