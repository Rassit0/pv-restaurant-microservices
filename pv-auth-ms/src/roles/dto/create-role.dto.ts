import { IsOptional, IsString, IsEnum, ArrayNotEmpty, ArrayMinSize } from "class-validator";

export class CreateRoleDto {
    @IsString({ message: "El nombre del rol debe ser una cadena de texto." })
    name: string;

    @IsString({ message: "La descripción debe ser una cadena de texto." })
    @IsOptional()
    description?: string;

    @IsOptional()
    @ArrayNotEmpty({ message: "Debe proporcionar al menos un permiso para el rol." })
    @ArrayMinSize(1, { message: "Debe incluir al menos un permiso." })
    // @IsEnum(PermissionType, { each: true, message: "Cada permiso debe ser un valor válido de PermissionType." })
    permissions?: string[]; // Lista de permisos asociados al rol
}

export class CreatePermissionDto {
    // @IsEnum(PermissionType, { message: "El permiso debe ser un valor válido de PermissionType." })
    @IsString()
    name: string; // Usa el enum de Prisma para validar los permisos
}
