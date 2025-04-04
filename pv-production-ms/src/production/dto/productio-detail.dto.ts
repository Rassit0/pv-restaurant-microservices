import { Type } from "class-transformer";
import {
    IsBoolean,
    IsDecimal,
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsPositive,
    IsUUID
} from "class-validator";
import { Exists } from "src/common/validators";

export class ProductionOrderDetailDto {
    @IsUUID()
    @IsNotEmpty({ message: 'El campo "recipeId" es obligatorio y debe ser un UUID válido.' })
    @Exists('recipe', 'id', { message: "El id de la receta no existe" })
    recipeId: string;

    //@IsNumber({}, { message: 'El campo "quantity" debe ser un número.' })
    @IsDecimal(
        { force_decimal: true, decimal_digits: '2', locale: 'en-US' },
        { message: 'La cantidad debe ser un número decimal con dos decimales.' }
    )
    @IsNotEmpty({ message: 'El campo "quantity" es obligatorio.' })
    //@Type(() => Number)
    quantity: number;

    @IsInt({ message: 'El tiempo de preparación debe ser un número entero.' })
    @IsPositive({ message: 'El tiempo de preparación debe ser mayor a 0 minutos.' })
    // @IsOptional()
    subTotalTime: number;

    @IsOptional()
    @IsUUID()
    @IsNotEmpty({ message: 'El campo "recipeId" es obligatorio y debe ser un UUID válido.' })
    @Exists('parallelGroup', 'id', { message: "El id del grupo de paralelos no existe" })
    parallelGroupId: string;

    @IsOptional()
    @IsBoolean({ message: 'isParallel debe ser un valor booleano.' })
    isParallel?: boolean;
}
