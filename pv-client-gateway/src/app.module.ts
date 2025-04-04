import { Module } from '@nestjs/common';
import { NatsModule } from './transports/nats/nats.module';
import { CategoriesModule } from './products-ms/categories/categories.module';
import { ProductsModule } from './products-ms/products/products.module';
import { UnitsModule } from './products-ms/units/units.module';
import { AuthModule } from './auth-ms/auth/auth.module';
import { RolesModule } from './auth-ms/roles/roles.module';
import { BranchesModule } from './branches-ms/branches/branches.module';
import { WarehousesModule } from './warehouses/warehouses.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { RecipesModule } from './production/recipes/recipes.module';
import { ProductionModule } from './production/production/production.module';
import { EntryModule } from './inventory/entry/entry.module';
import { TransactionModule } from './inventory/transaction/transaction.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [NatsModule, ProductsModule, CategoriesModule, UnitsModule, AuthModule, RolesModule, BranchesModule, WarehousesModule, SuppliersModule, RecipesModule, ProductionModule, EntryModule, TransactionModule, NotificationsModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
