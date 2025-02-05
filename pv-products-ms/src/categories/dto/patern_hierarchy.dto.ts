import { IsNotEmpty, IsString, Validate } from "class-validator";
import { IsCategoryIdValidConstraint } from "src/common/validators";

export class ParentHierarchyDto {
    // @IsString()
    // @IsNotEmpty({ message: "El ID del producto es obligatorio" })
    // productId: string;
    @IsString()
    @IsNotEmpty({ message: "El ID de la categoria padre es obligatoria" })
    @Validate(IsCategoryIdValidConstraint) //Validación personalizada para validar que exista el id
    parentId: string;
}