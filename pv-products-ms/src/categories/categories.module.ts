import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { IsCategoryIdValidConstraint } from 'src/common/validators';

@Module({
  controllers: [CategoriesController],
  imports: [PrismaModule],
  providers: [CategoriesService, IsCategoryIdValidConstraint],
  exports: [CategoriesService]
})
export class CategoriesModule { }
