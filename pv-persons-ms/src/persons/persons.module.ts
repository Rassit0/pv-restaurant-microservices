import { Module } from '@nestjs/common';
import { PersonsService } from './persons.service';
import { PersonsController } from './persons.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { NatsModule } from 'src/transports/nats/nats.module';

@Module({
  controllers: [PersonsController],
  imports: [PrismaModule, NatsModule],
  providers: [PersonsService],
})
export class PersonsModule { }
