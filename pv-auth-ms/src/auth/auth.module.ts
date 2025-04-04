import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { envs } from 'src/config';
import { NatsModule } from 'src/transports/nats/nats.module';

@Module({
  controllers: [AuthController],
  providers: [AuthService],
  imports:[
    PrismaModule,
    JwtModule.register({
      global: true,
      secret: envs.jwtSecret,
      signOptions:{
        expiresIn: '12h'
      }
    }),
    NatsModule,
  ]
})
export class AuthModule {}
