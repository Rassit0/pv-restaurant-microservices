import { IsDecimal, IsOptional, IsString, Min, Max, IsInt, IsNotEmpty } from "class-validator";
// import { Exists } from "src/common/validators";

export class BranchProductInventoryDto {
    @IsOptional()
    @IsString({ message: 'El ID del producto (productId) debe ser un texto válido.' })
    @IsNotEmpty({ message: 'El ID del producto es obligatorio.' })
    // @Exists("product", "id")
    productId?: string;

    @IsString({ message: 'El ID de la sucursal (branchId) debe ser un texto válido.' })
    @IsNotEmpty({ message: 'El ID de la sucursal es obligatorio.' })
    branchId: string;

    @IsDecimal(
        { force_decimal: true, decimal_digits: '2', locale: 'en-US' },
        { message: 'El stock debe ser un número decimal con dos decimales.' }
    )
    // @Min(0, { message: 'El stock no puede ser negativo.' })
    stock: number;

    @IsDecimal(
        { force_decimal: true, decimal_digits: '2', locale: 'en-US' },
        { message: 'El stock mínimo debe ser un número decimal con dos decimales.' }
    )
    // @Min(0, { message: 'El stock mínimo no puede ser negativo.' })
    minimumStock: number;

    @IsDecimal(
        { force_decimal: true, decimal_digits: '2', locale: 'en-US' },
        { message: 'El punto de reorden debe ser un número decimal con dos decimales.' }
    )
    // @Min(0, { message: 'El punto de reorden no puede ser negativo.' })
    reorderPoint: number;

    @IsOptional()
    @IsString({ message: 'La ubicación del stock debe ser un texto válido.' })
    warehouseId?: string;

    @IsOptional()
    @IsString({ message: 'La fecha de última actualización debe ser un texto válido.' })
    lastStockUpdate?: string;

    @IsOptional()
    @IsDecimal(
        { force_decimal: true, decimal_digits: '2,', locale: 'en-US' },
        { message: "El precio de compra en la sucursal del producto debe ser un número decimal con dos decimales." }
    )
    // @Min(0, { message: 'El precio de compra en la sucursal no puede ser negativo.' })
    purchasePriceOverride: number;

    @IsOptional()
    @IsDecimal(
        { force_decimal: true, decimal_digits: '2,', locale: 'en-US' },
        { message: "El precio(price) de venta en la sucursal debe ser un número decimal con dos decimales." }
    )
    // @Min(0, { message: 'El precio de venta en la sucursal no puede ser negativo.' })
    priceOverride: number;
}
