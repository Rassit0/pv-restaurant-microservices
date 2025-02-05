import { Type } from "class-transformer";
import { IsEnum, IsOptional, IsPositive, IsString, Min } from "class-validator";

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
    @Min(0)
    @Type(() => Number) // Obtiene el valor y lo vuelve número
    limit?: number = 0;

    @IsString()
    @IsOptional()
    search?: string;

    // Nuevo campo `status`, puede ser de tipo string o un enum
    @IsOptional()
    @IsEnum(Status, { message: 'El valor de "status" debe ser: active, inactive, all' }) // Valida que el valor de `status` sea uno de los valores del enum
    status?: Status; // Puede ser "active" o "inactive"

}