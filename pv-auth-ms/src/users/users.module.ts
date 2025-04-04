import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { NatsModule } from 'src/transports/nats/nats.module';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  imports: [NatsModule, PrismaModule],
})
export class UsersModule { }
