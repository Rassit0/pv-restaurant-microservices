import { Module } from '@nestjs/common';
import { RecipesService } from './recipes.service';
import { RecipesController } from './recipes.controller';
import { NatsModule } from 'src/transports/nats/nats.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [RecipesController],
  providers: [RecipesService],
  imports: [NatsModule, PrismaModule],
})
export class RecipesModule { }
