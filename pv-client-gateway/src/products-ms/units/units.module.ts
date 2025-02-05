import { Module } from '@nestjs/common';
import { UnitsController } from './units.controller';
import { NatsModule } from 'src/transports/nats/nats.module';

@Module({
  controllers: [UnitsController],
  imports: [NatsModule],
})
export class UnitsModule {}
