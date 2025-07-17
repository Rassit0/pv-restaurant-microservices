import { Transform } from "class-transformer";
import { IsInt, IsISO8601, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";
import { IsISO8601DateString } from "src/common/validators/is-iso8601-date-string.validator";

export class DashboardSummaryDto {
    // Define properties for the dashboard summary here
    // For example:
    @IsOptional()
    @IsUUID('all', { message: 'El ID de la sucursal debe ser un UUID válido.' })
    branchId?: string;

    @IsOptional()
    @IsISO8601DateString({ message: "La fecha debe ser una fecha válida en formato ISO 8601 Ej. 2023-03-15T13:45:30Z." })
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

class CountOrdersDto {
    // Define properties for the dashboard summary here
    // For example:
    @IsOptional()
    @IsUUID('all', { message: 'El ID de la sucursal debe ser un UUID válido.' })
    branchId?: string;

    @IsOptional()
    @IsString({ message: "El estado debe ser un texto válido." })
    status: string = "PENDING";

    @IsOptional()
    @IsISO8601DateString({ message: "La fecha debe ser una fecha válida en formato ISO 8601 Ej. 2023-03-15T13:45:30Z." })
    date?: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(12)
    month?: number;

    @IsOptional()
    @IsInt()
    year?: number;

    @IsOptional()
    @IsISO8601DateString({ message: "La fecha de inicio(startDate) debe ser una fecha válida en formato ISO 8601 (ejemplo: '2023-03-15T13:45:30Z')." })
    startDate?: string;

    @IsOptional()
    @IsISO8601DateString({ message: "La fecha de fin(endDate) debe ser una fecha válida en formato ISO 8601 (ejemplo: '2023-03-15T13:45:30Z')." })
    endDate?: string;
    // Add any other relevant properties as needed
}