import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RecipesModule } from './recipes/recipes.module';
import { ProductionModule } from './production/production.module';
import { PrismaModule } from './prisma/prisma.module';
import { PrismaService } from './prisma/prisma.service';
import { ExistsConstraint } from './common/validators';

@Module({
  imports: [RecipesModule, ProductionModule, PrismaModule],
  controllers: [AppController],
  providers: [AppService, PrismaService, ExistsConstraint],
})
export class AppModule {}
