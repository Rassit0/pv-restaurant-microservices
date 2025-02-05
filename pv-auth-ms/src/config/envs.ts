// Importar las varaiables de entorno de .env
import 'dotenv/config';

// importar joi para la validacion de esquemas de datos
import * as joi from 'joi';

// Definir una interface para las variables de entorno que se van a definir
interface EnvVars {
    // PORT: number;           // El puerto en el q el servidor debe escuchar
    DATABASE_URL: string;
    NATS_SERVERS: string[]; // Lista de servidores NATS
    JWT_SECRET: string;
}

// Define el equema de validación para las variables de entorno
const envsSchema = joi.object({
    // PORT: joi.number().required(),
    DATABASE_URL: joi.string().required(),
    NATS_SERVERS: joi.array().items(joi.string().required()),
    JWT_SECRET: joi.string().required(),
}).unknown(true); // Permite otras propiedades no definidas en el esquema

// Valida las variables de entorno que vienen de process.env y transforma NATS_SERVERS de un string a un array
const { error, value } = envsSchema.validate({
    ...process.env, // Expande todas las variables de entorno
    NATS_SERVERS: process.env.NATS_SERVERS.split(','),  // Convierte la variable de entorno NATS_SERVERS en un array, separando por comas
});

// Si ocurre un error durante la validación, lanza una execpción con el mensaje de error
if (error) {
    throw new Error(`Config validation error: ${error.message}`);
}

//Asigna las variables validadas a la interfaz 'envVars'
const envVars: EnvVars = value;

// Exporta las variables de entorno validadas para q puedan ser usadas en otras partes del codigo
export const envs = {
    // port: envVars.PORT, // El puerto donde el servidor escucha
    databaseUrl: envVars.DATABASE_URL,
    natsServers: envVars.NATS_SERVERS, // Lista de servidores NATS
    jwtSecret: envVars.JWT_SECRET,
}