import { Module } from '@nestjs/common';
import { UnitsService } from './units.service';
import { UnitsController } from './units.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ExistsConstraint } from 'src/common/validators';

@Module({
  controllers: [UnitsController],
  imports: [PrismaModule],
  providers: [UnitsService, ExistsConstraint],
})
export class UnitsModule {}
