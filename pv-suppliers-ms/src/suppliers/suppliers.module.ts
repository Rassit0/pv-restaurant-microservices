import { Module } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { SuppliersController } from './suppliers.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ExistsConstraint } from 'src/common/validators';
import { NatsModule } from 'src/transports/nats/nats.module';

@Module({
  controllers: [SuppliersController],
  imports: [PrismaModule, NatsModule],
  providers: [SuppliersService, ExistsConstraint],
})
export class SuppliersModule { }
