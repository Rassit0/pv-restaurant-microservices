import { ProductionOrderStatus } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsEnum, IsInt, IsISO8601, IsOptional, IsUUID, Max, Min } from "class-validator";
import { IsISO8601DateString } from "src/common/validators";

export class CountOrdersDto {
    // Define properties for the dashboard summary here
    // For example:
    @IsOptional()
    @IsUUID('all', { message: 'El ID de la sucursal (originBranchId) debe ser un UUID válido.' })
    originBranchId?: string;

    @IsEnum({ ...ProductionOrderStatus, all: 'all' }, { message: "El campo 'status' debe ser un valor válido." })
    @IsOptional()
    status: ProductionOrderStatus | 'all' = ProductionOrderStatus.PENDING;

    @IsOptional()
    @IsISO8601DateString({ message: "La fecha debe ser una fecha válida en formato ISO 8601 (ejemplo: '2023-03-15T13:45:30Z')." })
    date?: string;

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
    @IsISO8601DateString({ message: "La fecha de inicio(startDate) debe ser una fecha válida en formato ISO 8601 (ejemplo: '2023-03-15T13:45:30Z')." })
    startDate?: string;

    @IsOptional()
    @IsISO8601DateString({ message: "La fecha de fin(endDate) debe ser una fecha válida en formato ISO 8601 (ejemplo: '2023-03-15T13:45:30Z')." })
    endDate?: string;
    // Add any other relevant properties as needed
}