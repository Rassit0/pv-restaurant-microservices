import { AdjustmentType, InventoryMovementType } from '@prisma/client';
import { Transform, Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";
import { IsISO8601DateString } from "src/common/validators";

export class MovementsMonthlySummaryDto {
    @IsOptional()
    @Transform(({ value }) => {
        if (value) {
            const parsed = parseInt(value, 10);
            return isNaN(parsed) ? value : parsed;
        }
        return value;
    })
    @IsInt({ message: 'El año debe ser un número entero.' })
    year?: number;

    @IsOptional()
    @IsEnum({ ...InventoryMovementType, all: 'all' }, { message: "El campo 'movementType' debe ser un valor válido: " + Object.values({ ...InventoryMovementType, all: 'all' }).join(", ") + "." })
    movementType?: InventoryMovementType | 'all';

    @IsOptional()
    @IsEnum({ ...AdjustmentType, all: 'all' }, { message: "El campo 'adjustmentType' debe ser un valor válido: " + Object.values({ ...AdjustmentType, all: 'all' }).join(", ") + "." })
    adjustmentType?: AdjustmentType | 'all';

    @IsOptional()
    @IsUUID("all", { message: "El campo 'originBranchId' debe ser un UUID válido." })
    originBranchId?: string;

    @IsOptional()
    @IsUUID("all", { message: "El campo 'destinationBranchId' debe ser un UUID válido." })
    destinationBranchId?: string;

    @IsOptional()
    @IsUUID("all", { message: "El campo 'originWarehouseId' debe ser un UUID válido." })
    originWarehouseId?: string;

    @IsOptional()
    @IsUUID("all", { message: "El campo 'destinationWarehouseId' debe ser un UUID válido." })
    destinationWarehouseId?: string;

    @IsOptional()
    @IsUUID("all", { message: "El campo 'createdByUserId' debe ser un UUID válido." })
    createdByUserId?: string;

    @IsOptional()
    @Transform(({ value }) => {
        if (value) {
            const parsed = parseInt(value, 10);
            return isNaN(parsed) ? value : parsed;
        }
        return value;
    })
    @IsInt({ message: 'El mes debe ser un número entero.' })
    @Min(1, { message: 'El mes debe ser mayor o igual a 1.' })
    @Max(12, { message: 'El mes debe ser menor o igual a 12.' })
    month?: number;

    @IsOptional()
    @IsISO8601DateString({ message: "La fecha de inicio(startDate) debe ser una fecha válida en formato ISO 8601 (ejemplo: '2023-03-15T13:45:30Z')." })
    startDate?: string;

    @IsOptional()
    @IsISO8601DateString({ message: "La fecha de fin(endDate) debe ser una fecha válida en formato ISO 8601 (ejemplo: '2023-03-15T13:45:30Z')." })
    endDate?: string;
}