import { Module } from '@nestjs/common';
import { NatsModule } from './transports/nats/nats.module';
import { CategoriesModule } from './products-ms/categories/categories.module';
import { ProductsModule } from './products-ms/products/products.module';
import { UnitsModule } from './products-ms/units/units.module';
import { ReportsModule } from './products-ms/reports/reports.module';
import { AuthModule } from './auth-ms/auth/auth.module';
import { RolesModule } from './auth-ms/roles/roles.module';
import { BranchesModule } from './branches-ms/branches/branches.module';
import { WarehousesModule } from './warehouses/warehouses.module';
import { SuppliersModule } from './suppliers/suppliers.module';

@Module({
  imports: [NatsModule, ProductsModule, CategoriesModule, UnitsModule, ReportsModule, AuthModule, RolesModule, BranchesModule, WarehousesModule, SuppliersModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
