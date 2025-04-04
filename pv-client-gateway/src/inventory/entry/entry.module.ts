import { Module } from '@nestjs/common';
import { EntryController } from './entry.controller';
import { NatsModule } from 'src/transports/nats/nats.module';

@Module({
  controllers: [EntryController],
    imports: [NatsModule],
})
export class EntryModule {}
