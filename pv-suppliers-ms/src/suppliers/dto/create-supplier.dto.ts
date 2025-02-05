import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, IsUrl, ValidateNested } from "class-validator";
import { ContactInfoDto } from "./contact-info.dto";
import { Type } from "class-transformer";

export class CreateSupplierDto {
    @IsString({ message: 'El nombre debe ser un texto.' })
    @IsNotEmpty({ message: 'El nombre es obligatorio.' })
    name: string;

    @IsOptional()
    @IsString({ message: 'La dirección debe ser un texto.' })
    address?: string;

    @IsOptional()
    @IsString({message:'La ciudad debe ser un texto.'})
    city?: string;

    @IsOptional()
    @IsString({message:'El estado o provincia deb ser un texto'})
    state?: string;

    @IsOptional()
    @IsString({message:'El país debe ser un texto.'})
    country?: string;

    @IsOptional()
    @IsString({message: 'El codigo postal debe ser un texto.'})
    zipCode?: string;

    @IsOptional()
    @IsUrl({}, { message: 'La URL del sitio web no es válida.' })
    websiteUrl?: string;

    @IsOptional()
    @IsString({message: 'El número de identificación físcal debe ser un texto.'})
    taxId?: string;

    @IsOptional()
    @IsBoolean({message: 'El valor deve ser verdadero o falso.'})
    isActive?: boolean;

    @IsOptional()
    @IsArray({ message: 'Debe proporcionar una lista de contactos válida.' })
    @ValidateNested({ each: true })
    @Type(() => ContactInfoDto)
    contactsInfo: ContactInfoDto[]
}
