import { Transform, Type } from "class-transformer";
import { IsArray, IsEnum, IsIn, IsOptional, IsPositive, IsString } from "class-validator";
import { PaginationDto } from "src/common/dto/pagination.dto";

// Opcional: Si deseas definir un conjunto de valores posibles para el `status`
enum Status {
    Active = 'active',
    Inactive = 'inactive',
    All = 'all'
}

export class PersonPaginationDto extends PaginationDto {

    // Nuevo campo `status`, puede ser de tipo string o un enum
    @IsOptional()
    @IsEnum(Status, { message: 'El valor de "status" debe ser: active, inactive, all' }) // Valida que el valor de `status` sea uno de los valores del enum
    status?: Status; // Puede ser "active" o "inactive"

    @IsString()
    @IsOptional()
    @IsIn(['asc', 'desc'], { message: "El orden debe ser 'asc' o 'desc'." })
    orderBy: 'asc' | 'desc' = 'asc';

    @IsString()
    @IsOptional()
    @IsIn(['name', 'description', 'createdAt'], { message: "La columna de ordenamiento debe ser 'name', 'description' o 'createdAt'." })
    columnOrderBy: 'name' | 'description' | 'createdAt' = 'name';

    @IsOptional()
    @IsArray({ message: 'El campo "personIds" debe ser un arreglo.' })
    @IsString({ each: true, message: 'Cada elemento de "personIds" debe ser una cadena de texto.' })
    @Transform(({ value }) => (Array.isArray(value) ? value : [value])) // Asegura que siempre sea un arreglo
    personIds?: string[];
}