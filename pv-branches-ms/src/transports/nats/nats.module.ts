import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { envs, NATS_SERVICE } from 'src/config';

@Module({
    // Define un modulo de NestJS usando el decorador @Module
    imports: [
        // Lista de módulos q se importarán dentro de este módulo
        ClientsModule.register([
            // Registra un cliente para conectarse a NATS (un sistema de mensajeria)
            {
                name: NATS_SERVICE, // Nombre único para identificar el cliente NATS.
                transport: Transport.NATS, // Especifica el tipo de transporte (NATS)
                options: {
                    servers: envs.natsServers // Lista de servidores NATS, obtenida de las variables de entrno.
                }
            }
        ])
    ],
    exports: [
        // Lista de elementos q este módulo esportará para ser utilizados en otros módulos.
        ClientsModule.register([
            // Vuelve a registrar el cliente NATS para que esté disponible en otros módulos.
            {
                name: NATS_SERVICE, // Reutiliza el mismo nombre del cliente NATS>
                transport: Transport.NATS, // Define nuevamente el transporte NATS
                options: {
                    servers: envs.natsServers // Configuración del servidor NATS
                }
            }
        ])
    ]
})
export class NatsModule { }
