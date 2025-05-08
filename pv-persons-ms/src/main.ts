import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpStatus, Logger, ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, RpcException, Transport } from '@nestjs/microservices';
import { envs } from './config';
import { useContainer, ValidationError } from 'class-validator';

async function bootstrap() {

  const logger = new Logger("Persons MS");

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.NATS,
      options: {
        servers: envs.natsServers,
        // servers: 'nats-production-ebe4.up.railway.app',
      },
    },
  );

  useContainer(app.select(AppModule), { fallbackOnErrors: true }); // Para que funcione las validaciones personalizadas

  function extractValidationMessages(errors: ValidationError[], property: string = ''): string[] {
    const messages: string[] = [];

    errors.forEach((error) => {
      // Si el error tiene restricciones, extrae los mensajes de cada propiedad
      if (error.constraints) {
        messages.push(...Object.values(error.constraints).map((message) => `${property}${message}`));
      }

      // Si el error tiene hijos (subniveles de validación), recursivamente extrae los mensajes
      if (error.children && error.children.length > 0) {
        const errorProperty = property === '' ? error.property : `${property}.${error.property}.`;
        messages.push(...extractValidationMessages(error.children, errorProperty));
      }
    });

    return messages;
  }

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    validateCustomDecorators: true, // Permite las validaciones de decoradores personalizados
    exceptionFactory: (errors) => {
      // Manejar los errores para devolver en formato RcpException

      const messages = extractValidationMessages(errors);
      throw new RpcException({
        message: messages,
        statusCode: HttpStatus.BAD_REQUEST,
      })
    }
  }));

  await app.listen();

  logger.log('Persons Microservice running');
}
bootstrap();
