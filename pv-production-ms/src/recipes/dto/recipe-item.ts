import { IsDecimal, IsInt, IsOptional, IsPositive, IsUUID, Min } from "class-validator";
import { Transform, Type } from "class-transformer";

export class RecipeItemDto {

    @IsUUID('all', { message: 'El ID del producto debe ser un UUID válido.' })
    productId: string;

    @IsDecimal(
        { force_decimal: true, decimal_digits: '2', locale: 'en-US' },
        { message: 'La cantidad debe ser un número decimal con dos decimales.' }
    )
    quantity: number;

    @IsOptional()
    @IsUUID('all', { message: 'El ID de la receta debe ser un UUID válido.' })
    @Type(() => String)  // Para asegurar que el valor sea tratado como string
    recipeId?: string;
}
