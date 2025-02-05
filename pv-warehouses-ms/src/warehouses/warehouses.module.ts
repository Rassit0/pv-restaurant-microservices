import { Module } from '@nestjs/common';
import { WarehousesService } from './warehouses.service';
import { WarehousesController } from './warehouses.controller';
import { NatsModule } from 'src/transports/nats/nats.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [WarehousesController],
  providers: [WarehousesService],
  imports: [NatsModule, PrismaModule],
})
export class WarehousesModule { }
