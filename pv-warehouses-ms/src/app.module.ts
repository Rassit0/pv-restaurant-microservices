import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WarehousesModule } from './warehouses/warehouses.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [WarehousesModule, PrismaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
