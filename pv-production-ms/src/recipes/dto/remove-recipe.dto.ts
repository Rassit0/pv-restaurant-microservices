import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, IsUUID, MaxLength, ValidateNested } from "class-validator";
import { RecipeItemDto } from "./recipe-item";

export class RemoveRecipeDto {

    @IsUUID('all', { message: 'El ID de la receta debe ser un UUID válido.' })
    id: string;

    @IsUUID('all', { message: 'El ID de usuario que elimina la receta debe ser un UUID válido.' })
    deletedByUserId: string;
}
