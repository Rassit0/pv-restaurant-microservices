import { ProductionOrderStatus } from "@prisma/client";
import { Transform, Type } from "class-transformer";
import { IsDefined, isDefined, IsEnum, IsInt, IsOptional, IsString, IsUUID, Matches, Max, Min } from "class-validator";
import { IsISO8601DateString } from "src/common/validators";

export class ProductionMonthlySummaryDto {
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

    // @IsOptional()
    // @IsEnum({ ...ProductionOrderStatus, all: 'all' }, { message: "El campo 'status' debe ser un valor válido: " + Object.values(ProductionOrderStatus).join(", ") + "." })
    // status?: ProductionOrderStatus | 'all';

    @IsOptional()
    @IsUUID("all", { message: "El campo 'originBranchid' debe ser un UUID válido." })
    originBranchId?: string;

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