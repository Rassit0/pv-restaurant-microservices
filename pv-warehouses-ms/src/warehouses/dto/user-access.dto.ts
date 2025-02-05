import { IsEnum, IsUUID } from "class-validator";

enum WarehouseRole {
    ADMIN = 'ADMIN', // Administrador del almacén
    SUPERVISOR = 'SUPERVISOR', // Supervisor con permisos limitados
    OPERATOR = 'OPERATOR', // Operador con permisos de gestión de inventario
    READER = 'READER', // Solo lectura, sin permisos de modificación
}

export class UsersAccess {
    @IsUUID()
    userId: string

    @IsEnum(WarehouseRole, { message: 'El rol debe ser uno de los valores permitidos: ADMIN, SUPERVISOR, OPERATOR, READER' })
    role: WarehouseRole
}