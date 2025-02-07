import { Transform, Type } from "class-transformer";
import { IsEnum, IsIn, IsInt, IsOptional, IsPositive, IsString, Min, ValidateIf } from "class-validator";

// Opcional: Si deseas definir un conjunto de valores posibles para el `status`
enum Status {
    Active = 'active',
    Inactive = 'inactive',
    All = 'all'
}


export class UsersPaginationDto {
    @IsOptional()
    @IsPositive()
    @Type(() => Number) // Obtiene el valor y lo vuelve número
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: 'El límite debe ser un número entero.' })
    @Min(1, { message: 'El límite no puede ser menor a 1.' })
    limit?: number;

    @IsString()
    @IsOptional()
    search?: string;

    // Nuevo campo `status`, puede ser de tipo string o un enum
    @IsOptional()
    @IsEnum(Status, { message: 'El valor de "status" debe ser: active, inactive, all' }) // Valida que el valor de `status` sea uno de los valores del enum
    status?: Status; // Puede ser "active" o "inactive"

}