import { Module } from '@nestjs/common';
import { WarehousesController } from './warehouses.controller';
import { NatsModule } from 'src/transports/nats/nats.module';

@Module({
  controllers: [WarehousesController],
  providers: [],
  imports:[NatsModule]
})
export class WarehousesModule {}
