import { ExceptionFilter, Catch, ArgumentsHost, BadRequestException, HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { ValidationError } from 'class-validator';

@Catch(BadRequestException)  // Esto captura la excepción BadRequestException
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const message = exception.getResponse() as any;

    // Si la excepción contiene mensajes de validación
    if (message.message && Array.isArray(message.message)) {
      // Formatea los mensajes para que se devuelvan como desees
      const formattedMessages = message.message//this.formatValidationMessages(message.message);

      // Lanza la RpcException con los mensajes formateados
      throw new RpcException({
        message: message.message,  // Convertimos los mensajes a una cadena
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    // Si no es un error de validación, simplemente devuelves la respuesta original
    return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: message.message || 'Invalid request',
      });
  }

  // Función que formatea los mensajes de validación
  private formatValidationMessages(messages: string[]): string[] {
    return messages.map(msg => {
      // Aquí puedes personalizar el formato de los mensajes
      return msg.replace(/(?:\[[0-9]+\])/g, '');  // Elimina los índices del array en el path de los errores
    });
  }
}
