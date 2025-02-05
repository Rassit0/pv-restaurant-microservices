import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [ReportsController],
  imports: [PrismaModule],
  providers: [ReportsService],
})
export class ReportsModule { }
