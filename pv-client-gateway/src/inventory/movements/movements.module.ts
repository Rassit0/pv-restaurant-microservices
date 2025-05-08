import { Module } from '@nestjs/common';
import { MovementsController } from './movements.controller';
import { NatsModule } from 'src/transports/nats/nats.module';

@Module({
  controllers: [MovementsController],
      imports: [NatsModule],
})
export class MovementsModule {}
