import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MovementsModule } from './movements/movements.module';
import { EntryModule } from './entry/entry.module';
import { ExitModule } from './exit/exit.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [MovementsModule, EntryModule, ExitModule, PrismaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
