import { Module } from '@nestjs/common';
import { PersonsController } from './persons.controller';
import { NatsModule } from 'src/transports/nats/nats.module';

@Module({
  controllers: [PersonsController],
  providers: [],
    imports:[NatsModule]
})
export class PersonsModule {}
