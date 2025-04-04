import { ProductionOrderStatus } from "@prisma/client";
import { Transform, Type } from "class-transformer";
import { IsEnum, IsIn, IsNotEmpty, IsOptional, IsPositive, IsString } from "class-validator";
import { PaginationDto } from "src/common/dto/pagination.dto";
import { IsISO8601DateString } from "src/common/validators";

export class ProductionPaginationDto extends PaginationDto {
    @IsOptional()
    @IsEnum({ ...ProductionOrderStatus, ALL: 'all' }, {
        message: "El valor de 'status' debe ser: PENDING, IN_PROGRESS, COMPLETED, CANCELED o all."
    }) // Valida que el valor de `status` sea uno de los valores del enum o "all"
    status?: ProductionOrderStatus | 'all';

    @IsOptional()
    @IsString({ message: "El parámetro 'branchId' debe ser una cadena de texto válida." })
    // @IsNotEmpty({ message: "El parámetro 'branchId' es obligatorio y no puede estar vacío." })
    branchId?: string;

    @IsString()
    @IsOptional()
    @IsIn(['asc', 'desc'], { message: "El orden debe ser 'asc' o 'desc'." })
    orderBy: 'asc' | 'desc' = 'desc';

    @IsString()
    @IsOptional()
    @IsIn(['updatedAt', 'deliveryDate', 'createdAt'], { message: "La columna de ordenamiento debe ser 'name', 'description' o 'createdAt'." })
    columnOrderBy: 'updatedAt' | 'deliveryDate' | 'createdAt' = 'deliveryDate';

    @IsOptional()
    @IsISO8601DateString({ message: "La fecha de ingreso(entryDate) debe ser una fecha válida en formato ISO 8601 (ejemplo: '2025-01-01T00:00:00.000Z')." })
    date?: string;
}