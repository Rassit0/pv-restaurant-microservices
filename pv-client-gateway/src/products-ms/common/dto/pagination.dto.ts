import { Type } from "class-transformer";
import { IsOptional, IsPositive, IsString } from "class-validator";

export class PaginationDto {
    @IsOptional()
    @IsPositive()
    @Type(() => Number) // Obtiene el valor y lo vuelve número
    page?: number = 1;

    @IsOptional()
    @IsPositive()
    @Type(() => Number) // Obtiene el valor y lo vuelve número
    limit?: number = 10;

    @IsString()
    @IsOptional()
    search?: string | undefined;

}