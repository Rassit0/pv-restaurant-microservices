import { IsDecimal, IsOptional, IsString, Min, Max, IsInt, IsNotEmpty } from "class-validator";
import { Exists } from "src/common/validators";

export class WarehouseProductStockyDto {
    @IsOptional()
    @IsString({ message: 'El ID del producto (productId) debe ser un texto válido.' })
    @IsNotEmpty({ message: 'El ID del producto es obligatorio.' })
    @Exists("product", "id")
    productId?: string;

    @IsString({ message: 'El ID de la sucursal (branchId) debe ser un texto válido.' })
    @IsNotEmpty({ message: 'El ID de la sucursal es obligatorio.' })
    warehouseId: string;

    @IsDecimal(
        { force_decimal: true, decimal_digits: '2', locale: 'en-US' },
        { message: 'El stock debe ser un número decimal con dos decimales.' }
    )
    // @Min(0, { message: 'El stock no puede ser negativo.' })
    stock: number;
}
