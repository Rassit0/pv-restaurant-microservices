import { Module } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { SuppliersController } from './suppliers.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ExistsConstraint } from 'src/common/validators';

@Module({
  controllers: [SuppliersController],
  providers: [SuppliersService, ExistsConstraint],
  imports: [PrismaModule]
})
export class SuppliersModule { }
