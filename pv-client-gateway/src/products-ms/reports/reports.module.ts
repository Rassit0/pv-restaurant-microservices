import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { NatsModule } from 'src/transports/nats/nats.module';

@Module({
  controllers: [ReportsController],
  imports: [NatsModule]
})
export class ReportsModule { }
