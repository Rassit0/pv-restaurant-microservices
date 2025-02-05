import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpStatus, Logger, ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, RpcException, Transport } from '@nestjs/microservices';
import { envs } from './config';
import { useContainer } from 'class-validator';

async function bootstrap() {

  const logger = new Logger("Auth MS");

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.NATS,
      options: {
        servers: envs.natsServers
      }
    }
  );

  useContainer(app.select(AppModule), { fallbackOnErrors: true })// para que funcionen las validaciones personalizadas

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    validateCustomDecorators: true, // Permite la validación de decoradores personalizados
    exceptionFactory: (errors) => {
      // Extrae los mensajes de error y los agrupa en un array
      const messages = errors.flatMap((error) => Object.values(error.constraints || {}));

      // Lanza una RcpException con el formato personalizado
      throw new RpcException({
        massage: messages,
        statusCode: HttpStatus.BAD_REQUEST,
      })
    }
  }))

  await app.listen();

  logger.log(`Auth Microservices running`);
}
bootstrap();
