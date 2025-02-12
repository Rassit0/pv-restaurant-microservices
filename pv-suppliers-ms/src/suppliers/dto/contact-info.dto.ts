import { IsBoolean, IsEmail, IsEnum, IsInt, IsOptional, IsString, ValidateIf } from "class-validator";
import { Exists } from "src/common/validators";

enum PhoneType {
    MOBILE = 'MOBILE', // Teléfono móvil
    LANDLINE = 'LANDLINE', // Teléfono fijo
    WHATSAPP = 'WHATSAPP', // WhatsApp
    OTHER = 'OTHER', // Otros
}

enum ContactPosition {
    SALES = 'SALES', // Ventas
    SUPPORT = 'SUPPORT', // Soporte técnico
    MANAGER = 'MANAGER', // Gerente
    ADMINISTRATOR = 'ADMINISTRATOR', // Administrador
    OTHER = 'OTHER', // Otros
}

export class ContactInfoDto {

    @IsOptional()
    @IsInt()
    id?: number;

    @ValidateIf(o => !o.id)  // Solo valida si 'id' no está presente
    @IsString({ message: 'El nombre (contactName) de contacto es obligatorio.' })
    contactName: string;

    @ValidateIf(o => !o.id)  // Solo valida si 'id' no está presente
    @IsString({ message: 'El primer apellido (lastname) de contacto es obligatorio.' })
    lastname: string;

    @IsOptional()
    @IsString({ message: 'El primer apellido (lastname) de contacto es obligatorio.' })
    secondLastname: string;

    @IsOptional()
    @IsEmail({}, { message: 'Debe proporcionar un correo electrónico válido.' })
    @Exists({ model: 'contactInfo', property: 'email', excludeCurrentId: (o) => o.id }, { message: 'El email ya está registrado.' })
    email?: string;

    @IsOptional()
    @IsString({ message: 'El número de teéfono debe ser una cadena.' })
    @Exists({ model: 'contactInfo', property: 'phoneNumber', excludeCurrentId: o => o.id })
    phoneNumber?: string;

    @IsOptional()
    @IsEnum(PhoneType, { message: 'El tipo de teléfono debe ser uno de los valores permitidos: MOBILE, LANDLINE, WHATSAPP, OTHER.' })
    phoneType?: PhoneType;

    @IsOptional()
    @IsEnum(ContactPosition, { message: 'La posición de contacto solo admite los valores: SALES, SUPPORT, MANAGER, ADMINISTRATOR, OTHER.' })
    position: ContactPosition

    @IsOptional()
    @IsBoolean({ message: 'El valor deve ser verdadero o falso.' })
    isPrimary: boolean // para saber si es contacto principal
}