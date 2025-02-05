import { Module } from '@nestjs/common';
import { BranchesController } from './branches.controller';
import { NatsModule } from 'src/transports/nats/nats.module';

@Module({
  controllers: [BranchesController],
  imports: [NatsModule],
})
export class BranchesModule { }
