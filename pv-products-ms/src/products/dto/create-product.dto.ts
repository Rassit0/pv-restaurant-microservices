import { ProductType } from "@prisma/client";
import { ArrayMinSize, IsArray, IsBoolean, IsDateString, IsDecimal, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min, Validate, ValidateNested } from "class-validator";
import { Exists, IsCategoryIdValidConstraint, IsISO8601DateString, IsUnique } from "src/common/validators";
import { CategoryDto } from "./category.dto";
import { Type } from "class-transformer";
import { ComposedByProductsDto } from "./composed_by_products.dto";
import { BranchProductInventoryDto } from "./branch-product-inventory.dto";
import { TypesProductDto } from "./types-product.dto";

export class CreateProductDto {
    @IsString({ message: "El nombre(name) del producto debe ser un texto válido." })
    @IsNotEmpty({ message: 'El nombre del producto es obligatorio' })
    @IsUnique('product', 'name', { message: "El nombre del producto debe ser único" })
    name: string;

    @IsString({ message: "La descripción(description) del producto debe ser un texto válido." })
    @IsNotEmpty({ message: 'La descripción del producto es obligatorio' })
    description: string;

    @IsDecimal(
        { force_decimal: true, decimal_digits: '2,', locale: 'en-US' },
        { message: "El precio(price) debe ser un número decimal con dos decimales." }
    )
    @IsNotEmpty({ message: 'El precio(price) del producto es obligatorio' })
    price: number;

    @IsString({ message: "El campo unitId debe ser texto" })
    @Exists('unit', 'id', { message: "La id de la unidad de manejo no existe" })
    @IsNotEmpty({ message: 'La unidad de manejo(unitId) del producto es obligatorio' })
    unitId: string

    @IsOptional()
    @IsString({ message: "La URL de la imagen(imageUrl) debe ser un texto válido." })
    imageUrl?: string;

    @IsOptional()
    @IsISO8601DateString({ message: "La fecha de ultima venta(lastSaleDate) debe ser una fecha válida en formato ISO 8601 (ejemplo: '2025-01-01T00:00:00.000Z')." })
    lastSaleDate?: Date;

    @IsOptional()
    @IsISO8601DateString({ message: "La fecha de expiración(launchDate) debe ser una fecha válida en formato ISO 8601 (ejemplo: '2025-01-01T00:00:00.000Z')." })
    launchDate?: Date;

    @IsOptional()
    // @IsDateString({ strict: true }, { message: "La fecha de expiración debe ser una fecha válida en formato ISO 8601." })
    @IsISO8601DateString({ message: "La fecha de expiración(expirationDate) debe ser una fecha válida en formato ISO 8601 (ejemplo: '2025-01-01T00:00:00.000Z')." })
    expirationDate?: Date;

    @IsOptional() // Por defecto es true
    @IsBoolean({ message: "El campo 'isEnable' debe ser un valor booleano." })
    isEnable: boolean;

    @ArrayMinSize(1, { message: "Debe agregar minimo una categoría" })
    @IsArray({ message: "Debe agregar las categorías" })
    // Valida que sea un arreglo.
    @ValidateNested({ each: true }) // Esto es necesario para que `class-transformer` convierta el arreglo de objetos en instancias de CategoryDto
    @Type(() => CategoryDto)
    categories: CategoryDto[]

    @IsDecimal(
        { force_decimal: true, decimal_digits: '2,', locale: 'en-US' },
        { message: "El precio de compra del producto debe ser un número decimal con dos decimales." }
    )
    @IsNotEmpty({ message: 'El precio de compra del producto es obligatorio' })
    purchasePrice: number;

    @IsOptional()
    @IsString({ message: "El ID de la temporada debe ser un texto válido." })
    seasonId?: string;

    @IsOptional()
    @IsArray({ message: "Debe agregar el inventario por sucursal." })
    @ValidateNested({ each: true })
    @Type(() => BranchProductInventoryDto) // Asocia ProductBranchStockDto
    branchProductInventory?: BranchProductInventoryDto[]; // Agregado como un arreglo

    @IsNotEmpty({ message: "El campo 'typesProduct' no puede estar vacío." })
    @IsArray({ message: "El campo 'typesProduct' debe ser un array de tipos de producto." })
    @IsEnum(ProductType, { each: true, message: "Cada elemento de 'typesProduct' debe ser un tipo de producto válido: ${Object.values(ProductType).join(', ')}." })
    typesProduct: ProductType[];
}
