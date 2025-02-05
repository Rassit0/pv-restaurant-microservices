import { IsNotEmpty, IsString, Validate } from "class-validator";

export class ParentHierarchyDto {
    // @IsString()
    // @IsNotEmpty({ message: "El ID del producto es obligatorio" })
    // productId: string;
    @IsString()
    @IsNotEmpty({ message: "El ID de la categoria padre es obligatoria" })
    parentId: string;
}