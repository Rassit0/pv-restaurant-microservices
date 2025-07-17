import { Transform } from "class-transformer";
import { IsEnum, IsInt, IsISO8601, IsOptional, IsUUID, Max, Min } from "class-validator";
import { IsISO8601DateString } from "src/common/validators";

export class CountRecipesDto {
    // Define properties for the dashboard summary here
    // For example:
    // @IsOptional()
    // @IsUUID('all', { message: 'El ID de la sucursal debe ser un UUID válido.' })
    // branchId?: string;

    @IsEnum({ active: 'active', inactive: 'inactive', all: 'all' }, { message: "El campo 'status' debe ser un valor válido (active, inactive o all)." })
    @IsOptional()
    status: 'active' | 'inactive' | 'all' = 'all';

    @IsOptional()
    @IsISO8601DateString({ message: "La fecha (createdDate) debe ser una fecha válida en formato ISO 8601 (ejemplo: '2023-03-15T13:45:30Z')." })
    createdDate?: string;

    @IsOptional()
    @Transform(({ value }) => {
        if (value) {
            const parsed = parseInt(value, 10);
            return isNaN(parsed) ? value : parsed;
        }
        return value;
    })
    @IsInt({ message: 'El mes (createdMonth) debe ser un número entero.' })
    @Min(1, { message: 'El mes (createdMonth) debe ser mayor o igual a 1.' })
    @Max(12, { message: 'El mes (createdMonth) debe ser menor o igual a 12.' })
    createdMonth?: number;

    @IsOptional()
    @Transform(({ value }) => {
        if (value) {
            const parsed = parseInt(value, 10);
            return isNaN(parsed) ? value : parsed;
        }
        return value;
    })
    @IsInt({ message: 'El año (createdYear) debe ser un número entero.' })
    createdYear?: number;

    @IsOptional()
    @IsISO8601DateString({ message: "La fecha de inicio(createStartDate) debe ser una fecha válida en formato ISO 8601 (ejemplo: '2023-03-15T13:45:30Z')." })
    createdStartDate?: string;

    @IsOptional()
    @IsISO8601DateString({ message: "La fecha de fin(createEndDate) debe ser una fecha válida en formato ISO 8601 (ejemplo: '2023-03-15T13:45:30Z')." })
    createdEndDate?: string;
    // Add any other relevant properties as needed
}