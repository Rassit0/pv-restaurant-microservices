import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NatsModule } from 'src/transports/nats/nats.module';

@Module({
  controllers: [NotificationsController],
  imports: [NatsModule]
})
export class NotificationsModule { }
