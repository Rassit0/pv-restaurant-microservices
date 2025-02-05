import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CategoriesModule } from 'src/categories/categories.module';
import { IsCategoryIdValidConstraint, IsUniqueConstraint } from 'src/common/validators';
import { IsComposedProductIdValidConstraint } from 'src/products/validators/is-composed_product-id-valid.constraint';
import { NatsModule } from 'src/transports/nats/nats.module';

@Module({
  controllers: [ProductsController],
  imports: [PrismaModule, CategoriesModule, NatsModule],
  providers: [ProductsService, IsUniqueConstraint, IsCategoryIdValidConstraint, IsComposedProductIdValidConstraint],
  exports: [ProductsService]
})
export class ProductsModule { }
