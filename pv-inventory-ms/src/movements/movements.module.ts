import { Module } from '@nestjs/common';
import { MovementsService } from './movements.service';
import { MovementsController } from './movements.controller';
import { NatsModule } from 'src/transports/nats/nats.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [MovementsController],
  providers: [MovementsService],
  imports: [NatsModule, PrismaModule],
})
export class MovementsModule { }
