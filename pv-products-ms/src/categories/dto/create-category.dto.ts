import { Type } from "class-transformer";
import { IsArray, IsOptional, IsString, MaxLength, Validate, ValidateNested } from "class-validator";
import { IsCategoryIdValidConstraint, IsUnique } from "src/common/validators";
import { ParentHierarchyDto } from "./patern_hierarchy.dto";

export class CreateCategoryDto {
    @IsString({ message: 'El nombre debe ser un texto' })
    @MaxLength(100, { message: 'El nombre no puede tener más de 100 caracteres' })
    @IsUnique('category', 'name', { message: "El nombre de la categoría debe ser único" })
    name: string;

    @IsString({ message: 'La descripción debe ser un texto' })
    description: string;

    @IsString({ message: 'La URL de la imagen debe ser un texto válido' })
    @IsOptional()
    imageUrl?: string;

    // @ArrayMinSize(1, { message: "Debe agregar minimo un insumo" })
    @IsArray({ message: "Debe agregar categorías padre" })
    // Valida que sea un arreglo.
    @ValidateNested({ each: true, message: "Cada valor en la propiedad anidada productCompositions debe ser un objeto o una matriz." }) // Esto es necesario para que `class-transformer` convierta el arreglo de objetos en instancias de CategoryDto
    @IsOptional()
    @Type(() => ParentHierarchyDto)
    parentsHierarchy: ParentHierarchyDto[]
}
