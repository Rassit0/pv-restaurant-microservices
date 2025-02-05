import { IsDecimal, IsNotEmpty, IsString, Validate } from "class-validator";

export class ComposedByProductsDto {
    // @IsString()
    // @IsNotEmpty({ message: "El ID del producto es obligatorio" })
    // productId: string;
    @IsString()
    @IsNotEmpty({ message: "El ID del producto de tipo insumo es obligatorio" })
    composedProductId: string;
    
    @IsDecimal(
        { force_decimal: true, decimal_digits: '2,', locale: 'en-US' },
        { message: "La cantidad debe ser un número decimal con dos decimales." }
    )
    @IsNotEmpty({ message: "La cantidad es obligatoria" })
    quantity: number;
}