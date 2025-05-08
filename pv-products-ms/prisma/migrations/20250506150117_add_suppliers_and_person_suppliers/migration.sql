-- CreateTable
CREATE TABLE "product_suppliers" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_suppliers" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "person_suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_suppliers_product_id_supplier_id_key" ON "product_suppliers"("product_id", "supplier_id");

-- CreateIndex
CREATE UNIQUE INDEX "person_suppliers_product_id_person_id_key" ON "person_suppliers"("product_id", "person_id");

-- AddForeignKey
ALTER TABLE "product_suppliers" ADD CONSTRAINT "product_suppliers_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_suppliers" ADD CONSTRAINT "person_suppliers_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
