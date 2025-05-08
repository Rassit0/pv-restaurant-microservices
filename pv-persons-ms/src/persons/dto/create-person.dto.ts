import {
    IsBoolean,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
    MinLength
} from "class-validator";

export class CreatePersonDto {

    @IsString({ message: 'El nombre (name) es obligatorio y debe ser una cadena de texto.' })
    @MinLength(2, { message: 'El nombre (name) debe tener al menos 2 caracteres.' })
    name: string;

    @IsString({ message: 'El apellido paterno (lastname) es obligatorio y debe ser una cadena de texto.' })
    @MinLength(2, { message: 'El apellido paterno (lastname) debe tener al menos 2 caracteres.' })
    lastname: string;

    @IsOptional()
    @IsString({ message: 'El apellido materno (secondLastname) es obligatorio y debe ser una cadena de texto.' })
    @MinLength(2, { message: 'El apellido materno (secondLastname) debe tener al menos 2 caracteres.' })
    secondLastname?: string;

    @IsString({ message: 'El NIT (nit) es obligatorio y debe ser una cadena de texto.' })
    @MinLength(4, { message: 'El NIT (nit) debe tener al menos 4 caracteres.' })
    nit: string;

    @IsOptional()
    @IsString({ message: 'La URL de la imagen (imageUrl) debe ser una cadena de texto.' })
    imageUrl?: string;

    @IsOptional()
    @IsBoolean({ message: 'El estado activo (isActive) debe ser verdadero o falso.' })
    isActive?: boolean;

    @IsUUID('all', { message: 'El campo createdByUserId debe ser un UUID válido.' })
    @IsNotEmpty({ message: "El campo 'createdByUserId' es obligatorio y debe ser un UUID válido." })
    createdByUserId: string;
}
