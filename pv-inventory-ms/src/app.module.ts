import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TransactionModule } from './transaction/transaction.module';
import { EntryModule } from './entry/entry.module';
import { ExitModule } from './exit/exit.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [TransactionModule, EntryModule, ExitModule, PrismaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
