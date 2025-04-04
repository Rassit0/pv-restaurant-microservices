import { InventoryMovementType, StatusInventoryMovement } from "@prisma/client";
import { Type } from "class-transformer";
import { IsEnum, IsIn, IsInt, IsOptional, IsPositive, IsString, Min, ValidateIf } from "class-validator";
import { IsISO8601DateString } from "src/common/validators";

// Opcional: Si deseas definir un conjunto de valores posibles para el `status`


export class TransactionsPaginationDto {
    @IsOptional()
    @IsPositive()
    @Type(() => Number) // Obtiene el valor y lo vuelve número
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: 'El límite debe ser un número entero.' })
    @Min(1, { message: 'El límite no puede ser menor a 1.' })
    limit?: number;

    // @IsString()
    // @IsOptional()
    // search?: string;

    // Permitir un array de estados
    @IsOptional()
    @IsEnum(StatusInventoryMovement, { each: true, message: 'Cada valor en "status" debe ser: PENDING, ACCEPTED, CANCELED, COMPLETED' })
    @Type(() => String) // Convierte cada valor a string
    status?: StatusInventoryMovement[];

    @IsOptional()
    @IsEnum(InventoryMovementType, { each: true, message: 'Cada valor en "movementType" debe ser: INCOME, OUTCOME, ADJUSTMENT, TRANSFER' })
    @Type(() => String) // Convierte cada valor a string
    movementType?: InventoryMovementType[];

    @IsString()
    @IsOptional()
    @IsIn(['asc', 'desc'], { message: "El orden debe ser 'asc' o 'desc'." })
    orderBy: 'asc' | 'desc' = 'desc';

    @IsString()
    @IsOptional()
    @IsIn(['updatedAt', 'createdAt'], { message: "La columna de ordenamiento debe ser 'name', 'description' o 'createdAt'." })
    columnOrderBy: 'createdAt' | 'updatedAt' = 'createdAt';


    @IsOptional()
    // @IsDateString({ strict: true }, { message: "La fecha de expiración debe ser una fecha válida en formato ISO 8601." })
    @IsISO8601DateString({ message: "La fecha de inicio(startDate) debe ser una fecha válida en formato ISO 8601 (ejemplo: '2025-01-01T00:00:00.000Z')." })
    startDate?: Date;

    @IsOptional()
    // @IsDateString({ strict: true }, { message: "La fecha de expiración debe ser una fecha válida en formato ISO 8601." })
    @IsISO8601DateString({ message: "La fecha de final(endDate) debe ser una fecha válida en formato ISO 8601 (ejemplo: '2025-01-01T00:00:00.000Z')." })
    endDate?: Date;
}