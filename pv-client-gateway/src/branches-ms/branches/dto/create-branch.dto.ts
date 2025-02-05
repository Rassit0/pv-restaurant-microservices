import { IsEmail, IsLatitude, IsLongitude, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateBranchDto {
    @IsString()
    @IsNotEmpty({ message: 'El nombre es obligatorio' })
    name: string;

    @IsString()
    @IsNotEmpty({ message: 'La ubicación es obligatoria' })
    location: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsEmail({}, { message: 'Debe proporcionar un correo válido' })
    email?: string;

    @IsOptional()
    @IsString()
    managerId: string;

    @IsOptional()
    @IsNumber({}, { message: 'La latitud debe ser un número' })
    @IsLatitude({ message: 'La latitud debe ser válida' })
    latitude?: number;

    @IsOptional()
    @IsNumber({}, { message: 'La longitud debe ser un número' })
    @IsLongitude({ message: 'La longitud debe ser válida' })
    longitude?: number

    @IsOptional()
    @IsString({ message: "La URL de la imagen(imageUrl) debe ser un texto válido." })
    imageUrl?: string;
}
