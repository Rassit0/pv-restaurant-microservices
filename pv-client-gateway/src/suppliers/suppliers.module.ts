import { Module } from '@nestjs/common';
import { SuppliersController } from './suppliers.controller';
import { NatsModule } from 'src/transports/nats/nats.module';

@Module({
  controllers: [SuppliersController],
  imports: [NatsModule],
})
export class SuppliersModule { }
