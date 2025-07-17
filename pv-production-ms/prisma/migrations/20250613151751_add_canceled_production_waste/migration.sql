-- CreateTable
CREATE TABLE "canceled_production_waste" (
    "id" TEXT NOT NULL,
    "production_order_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "canceled_production_waste_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "canceled_production_waste" ADD CONSTRAINT "canceled_production_waste_production_order_id_fkey" FOREIGN KEY ("production_order_id") REFERENCES "production_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
