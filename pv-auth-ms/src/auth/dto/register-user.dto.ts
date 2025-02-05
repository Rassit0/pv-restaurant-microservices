import { IsEmail, IsNotEmpty, IsOptional, IsString, IsStrongPassword, IsUUID } from "class-validator";

export class RegisterUserDto {

    @IsString()
    @IsNotEmpty({message: 'El nombre de usuario es requerido.'})
    name: string;

    @IsEmail()
    email: string;

    @IsString()
    @IsStrongPassword({
        minLength: 8,
        minUppercase: 1,
        minLowercase: 1,
        minNumbers: 1,
        minSymbols: 1,
    }, {
        message: 'La contraseña debe tener al menos 8 caracteres, una letra mayúscula, una letra minúscula, un número y un símbolo.'
    })
    password: string;

    @IsUUID()
    @IsNotEmpty()
    roleId: string;

    @IsOptional()
    @IsString()
    imageUrl?: string;
}