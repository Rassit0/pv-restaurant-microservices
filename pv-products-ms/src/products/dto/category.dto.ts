import { IsNotEmpty, IsString, Validate } from "class-validator";
import { IsCategoryIdValidConstraint } from "src/common/validators";

export class CategoryDto {
    @IsString()
    @IsNotEmpty({ message: 'El ID de la categoría es obligatorio' })
    @Validate(IsCategoryIdValidConstraint, { message: "El ID de la categoría no es válido o no existe." })  // Usamos el validador personalizado para validar cada categoryId
    id: string;
}