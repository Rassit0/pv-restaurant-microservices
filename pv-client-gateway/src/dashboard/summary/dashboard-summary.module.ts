import { Module } from '@nestjs/common';
import { DashboardSummaryController } from './dashboard-summary.controller';
import { NatsModule } from 'src/transports/nats/nats.module';

@Module({
  controllers: [DashboardSummaryController],
  imports: [NatsModule],
})
export class DashboardSummaryModule {}
