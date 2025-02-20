import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BranchesModule } from './branches/branches.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [BranchesModule, PrismaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
