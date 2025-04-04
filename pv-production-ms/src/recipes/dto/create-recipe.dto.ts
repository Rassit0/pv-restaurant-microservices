import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, IsUUID, MaxLength, ValidateNested } from "class-validator";
import { RecipeItemDto } from "./recipe-item";

export class CreateRecipeDto {

    @IsString({ message: 'El nombre debe ser una cadena de texto.' })
    @IsNotEmpty({ message: 'El nombre de la receta es obligatorio.' })
    @MaxLength(255, { message: 'El nombre de la receta no debe exceder los 255 caracteres.' })
    name: string;

    @IsOptional()
    @IsString({ message: 'La descripción debe ser una cadena de texto.' })
    description?: string;

    @IsUUID('all', { message: 'El ID de usuario que crea la receta debe ser un UUID válido.' })
    createdByUserId: string;

    @IsUUID('all', { message: 'El ID de usuario que actualiza la receta debe ser un UUID válido.' })
    updatedByUserId: string;

    @IsOptional()
    @IsString({ message: 'Las instrucciones de preparación deben ser una cadena de texto.' })
    preparationInstructions?: string;

    @IsOptional()
    @IsArray({ message: 'Debe agregar las sucursales que usarán el almacén.' })
    @ValidateNested({ each: true, message: 'Cada sucursal debe ser un objeto válido.' })
    @Type(() => RecipeItemDto) // Convierte los elementos de la lista a instancias de RecipeItemDto
    @IsNotEmpty({ each: true, message: 'Cada receta debe tener al menos un producto.' })  // Verifica que no esté vacío
    items?: RecipeItemDto[];

    @IsOptional()
    @IsString({ message: 'La imageUrl debe ser una cadena de texto.' })
    imageUrl?: string;

    @IsInt({ message: 'El tiempo de preparación debe ser un número entero.' })
    @IsPositive({ message: 'El tiempo de preparación debe ser mayor a 0 minutos.' })
    // @IsOptional()
    preparationTime: number;

    @IsOptional()
    @IsBoolean({ message: 'El estado de la receta debe ser un valor booleano.' })
    isEnable?: boolean;
}
