import {
    IsEmail,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsStrongPassword,
    IsUUID,
    IsBoolean,
    ValidateNested,
    IsArray
} from "class-validator";
import { Type } from "class-transformer";

export class UserBranchDto {
    // @IsUUID()
    // @IsNotEmpty({ message: 'El ID del usuario es requerido.' })
    // userId: string;

    @IsUUID()
    @IsNotEmpty({ message: 'El ID de la sucursal es requerido.' })
    branchId: string;
}

export class RegisterUserDto {
    @IsString()
    @IsNotEmpty({ message: 'El nombre de usuario es requerido.' })
    name: string;

    @IsEmail({}, { message: 'El correo electrónico no es válido.' })
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
    @IsNotEmpty({ message: 'El ID del rol es requerido.' })
    roleId: string;

    @IsOptional()
    @IsString()
    imageUrl?: string;

    @IsBoolean()
    @IsOptional()
    isEnable?: boolean;

    @IsBoolean()
    @IsOptional()
    hasGlobalBranchesAccess?: boolean;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => UserBranchDto)
    @IsOptional()
    userBranches?: UserBranchDto[];
}
