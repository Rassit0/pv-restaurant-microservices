import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { NatsModule } from 'src/transports/nats/nats.module';

@Module({
  controllers: [CategoriesController],
  imports: [NatsModule]
})
export class CategoriesModule { }
