import { ProductType } from "@prisma/client";
import { IsDecimal, IsOptional, IsString, Min, Max, IsInt, IsNotEmpty, IsEnum } from "class-validator";
import { Exists } from "src/common/validators";

export class TypesProductDto {
    // @IsOptional()
    // @IsString({ message: 'El ID del producto (productId) debe ser un texto válido.' })
    // @IsNotEmpty({ message: 'El ID del producto es obligatorio.' })
    // @Exists("product", "id")
    // productId?: string;

    @IsString({ message: 'El ID de la sucursal (branchId) debe ser un texto válido.' })
    @IsEnum(ProductType)
    typeProduct: ProductType;

}
