import { Module } from '@nestjs/common';
import { ExitService } from './exit.service';
import { ExitController } from './exit.controller';

@Module({
  controllers: [ExitController],
  providers: [ExitService],
})
export class ExitModule {}
