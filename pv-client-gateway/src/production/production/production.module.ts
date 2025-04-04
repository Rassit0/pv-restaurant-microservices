import { Module } from '@nestjs/common';
import { ProductionController } from './production.controller';
import { NatsModule } from 'src/transports/nats/nats.module';

@Module({
  controllers: [ProductionController],
  imports: [NatsModule],
})
export class ProductionModule { }
