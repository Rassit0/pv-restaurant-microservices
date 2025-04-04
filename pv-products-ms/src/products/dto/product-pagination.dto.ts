import { Transform, Type } from "class-transformer";
import { IsArray, IsEnum, IsIn, IsOptional, IsPositive, IsString } from "class-validator";
import { PaginationDto } from "src/common/dto/pagination.dto";

// Opcional: Si deseas definir un conjunto de valores posibles para el `status`
enum Status {
    Active = 'active',
    Inactive = 'inactive',
    All = 'all'
}

export class ProductPaginationDto extends PaginationDto {

    // Nuevo campo `status`, puede ser de tipo string o un enum
    @IsOptional()
    @IsEnum(Status, { message: 'El valor de "status" debe ser: active, inactive, all' }) // Valida que el valor de `status` sea uno de los valores del enum
    status?: Status; // Puede ser "active" o "inactive"

    // Aquí puedes agregar campos específicos para los productos si es necesario
    @IsOptional()
    @IsString()
    category?: string;

    @IsOptional()
    @IsString()
    branchId?: string;

    @IsOptional()
    @IsString()
    warehouseId?: string;

    @IsOptional()
    @IsPositive()
    @Type(() => Number)
    minPrice?: number;

    @IsOptional()
    @IsPositive()
    @Type(() => Number)
    maxPrice?: number;

    @IsString()
    @IsOptional()
    @IsIn(['asc', 'desc'], { message: "El orden debe ser 'asc' o 'desc'." })
    orderBy: 'asc' | 'desc' = 'asc';

    @IsString()
    @IsOptional()
    @IsIn(['name', 'description', 'createdAt'], { message: "La columna de ordenamiento debe ser 'name', 'description' o 'createdAt'." })
    columnOrderBy: 'name' | 'description' | 'createdAt' = 'name';

    @IsOptional()
    @IsArray({ message: 'El campo "productIds" debe ser un arreglo.' })
    @IsString({ each: true, message: 'Cada elemento de "productIds" debe ser una cadena de texto.' })
    @Transform(({ value }) => (Array.isArray(value) ? value : [value])) // Asegura que siempre sea un arreglo
    productIds?: string[];
}