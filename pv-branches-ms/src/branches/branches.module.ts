import { Module } from '@nestjs/common';
import { BranchesService } from './branches.service';
import { BranchesController } from './branches.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { NatsModule } from 'src/transports/nats/nats.module';

@Module({
  controllers: [BranchesController],
  providers: [BranchesService],
  imports: [PrismaModule, NatsModule], // Para tener comunicacion con otros microservicios
})
export class BranchesModule {}
