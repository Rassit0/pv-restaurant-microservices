import { Module } from '@nestjs/common';
import { RecipesController } from './recipes.controller';
import { NatsModule } from 'src/transports/nats/nats.module';

@Module({
  controllers: [RecipesController],
    imports: [NatsModule]
})
export class RecipesModule {}
