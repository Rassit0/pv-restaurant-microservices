import { Module } from '@nestjs/common';
import { ProductionService } from './production.service';
import { ProductionController } from './production.controller';
import { NatsModule } from 'src/transports/nats/nats.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [ProductionController],
  providers: [ProductionService],
  imports: [NatsModule, PrismaModule],
})
export class ProductionModule { }
