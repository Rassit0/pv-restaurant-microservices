import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { PersonsModule } from './persons/persons.module';
import { PrismaService } from './prisma/prisma.service';

@Module({
  imports: [PrismaModule, PersonsModule],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule { }
