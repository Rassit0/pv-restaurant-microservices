import { Transform, Type } from "class-transformer";
import { IsArray, IsBoolean, IsEnum, IsIn, IsOptional, IsPositive, IsString } from "class-validator";
import { PaginationDto } from "src/common/dto/pagination.dto";

// Opcional: Si deseas definir un conjunto de valores posibles para el `status`
enum Status {
    Active = 'active',
    Inactive = 'inactive',
    All = 'all'
}

export class SupplierPaginationDto extends PaginationDto {

    // Nuevo campo `status`, puede ser de tipo string o un enum
    @IsOptional()
    @IsEnum(Status, { message: 'El valor de (status) debe ser: active, inactive, all' }) // Valida que el valor de `status` sea uno de los valores del enum
    status?: Status; // Puede ser "active" o "inactive"

    @IsString()
    @IsOptional()
    @IsIn(['asc', 'desc'], { message: "El orden (orderBy) debe ser 'asc' o 'desc'." })
    orderBy: 'asc' | 'desc' = 'asc';

    @IsString()
    @IsOptional()
    @IsIn(['name', 'address', 'createdAt'], { message: "La columna de ordenamiento (columnOrderBy) debe ser 'name', 'address' o 'createdAt'." })
    columnOrderBy: 'name' | 'type' | 'address' | 'city' | 'state' | 'country' | 'createdAt' = 'name';

    @IsOptional()
    @IsArray({ message: 'El campo "supplierIds" debe ser un arreglo.' })
    @IsString({ each: true, message: 'Cada elemento de "supplierIds" debe ser una cadena de texto.' })
    @Transform(({ value }) => (Array.isArray(value) ? value : [value])) // Asegura que siempre sea un arreglo
    supplierIds?: string[];

    @IsOptional()
    @IsBoolean({ message: 'El campo (eliminated) debe ser un valor boolean.' })
    deleted: boolean = false;

    @IsString()
    @IsOptional()
    searchName?: string | undefined;
}