import { Module } from '@nestjs/common';
import { RolesController } from './roles.controller';
import { NatsModule } from 'src/transports/nats/nats.module';

@Module({
  controllers: [RolesController],
  imports: [NatsModule],
})
export class RolesModule {}
