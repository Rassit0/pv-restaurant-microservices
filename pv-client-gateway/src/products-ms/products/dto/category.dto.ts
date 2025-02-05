import { IsNotEmpty, IsString, Validate } from "class-validator";

export class CategoryDto {
    @IsString()
    @IsNotEmpty({ message: 'El ID de la categoría es obligatorio' })
    id: string;
}