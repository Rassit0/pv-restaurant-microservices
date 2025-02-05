import { IsDecimal, IsNotEmpty, IsString, Validate } from "class-validator";
import { IsComposedProductIdValidConstraint } from "src/products/validators/is-composed_product-id-valid.constraint";

export class ComposedByProductsDto {
    // @IsString()
    // @IsNotEmpty({ message: "El ID del producto es obligatorio" })
    // productId: string;
    @IsString()
    @IsNotEmpty({ message: "El ID del producto de tipo insumo es obligatorio" })
    @Validate(IsComposedProductIdValidConstraint)
    composedProductId: string;

    @IsDecimal(
        { force_decimal: true, decimal_digits: '2,', locale: 'en-US' },
        { message: "La cantidad debe ser un número decimal con dos decimales." }
    )
    @IsNotEmpty({ message: "La cantidad es obligatoria" })
    quantity: number;
}