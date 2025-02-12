import { Type } from "class-transformer";
import { IsEnum, IsOptional, IsPositive, IsString, Min } from "class-validator";

export class PaginationDto {
    @IsOptional()
    @IsPositive()
    @Type(() => Number) // Obtiene el valor y lo vuelve número
    page?: number = 1;

    @IsOptional()
    @Min(0)
    @Type(() => Number) // Obtiene el valor y lo vuelve número
    limit?: number = 0;

    @IsString()
    @IsOptional()
    search?: string | undefined;
}