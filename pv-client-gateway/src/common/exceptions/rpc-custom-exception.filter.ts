import { ArgumentsHost, Catch, ExceptionFilter } from "@nestjs/common";
// Importa interfaces y decoradores necesarios para manejar excepciones en NestJS.

import { RpcException } from "@nestjs/microservices";
// Importa la clase RpcException, que representa excepciones generadas en el contexto de microservicios.

@Catch(RpcException)
// Decorador que indica que esta clase es un filtro de excepciones diseñado para manejar RpcException específicamente.

export class RpcCustomExceptionFilter implements ExceptionFilter {
// Define una clase que implementa la interfaz ExceptionFilter para personalizar el manejo de excepciones.

    catch(exception: RpcException, host: ArgumentsHost) {
        // Método requerido por ExceptionFilter para interceptar excepciones específicas.
        // Toma como argumentos la excepción capturada y el contexto del host (HTTP, RPC, etc.).

        const context = host.switchToHttp();
        // Cambia el contexto de ejecución a HTTP para obtener la respuesta y otros objetos relacionados.

        const response = context.getResponse();
        // Obtiene el objeto de respuesta asociado con el contexto HTTP.

        const rpcError = exception.getError();
        // Extrae el error encapsulado dentro de la RpcException. Puede ser un string, objeto, etc.

        if (typeof rpcError === 'object' && 'statusCode' in rpcError && 'message' in rpcError) {
            // Comprueba si el error extraído es un objeto que contiene las propiedades `statusCode` y `message`.

            const statusCode = rpcError.statusCode;
            // Extrae el código de estado del error.

            return response.status(statusCode).json({
                // Establece el código de estado HTTP en la respuesta.
                statusCode,
                // Incluye el código de estado en la respuesta JSON.
                message: rpcError.message,
                // Incluye el mensaje del error en la respuesta JSON.
            });
        }

        return response.status(500).json({
            // Si el error no tiene un formato esperado, devuelve un estado 500 (Error interno del servidor).
            message: "Internal Server Error"
            // Incluye un mensaje genérico indicando un error interno del servidor.
        });

    }
}
