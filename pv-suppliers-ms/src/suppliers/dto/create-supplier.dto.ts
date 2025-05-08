import { IsArray, IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl, IsUUID, Min, min, ValidateIf, ValidateNested } from "class-validator";
import { ContactInfoDto } from "./contact-info.dto";
import { Type } from "class-transformer";
import { IsMutuallyExclusive } from "src/common/validators/IsMutuallyExclusive";
import { IsRequiredIf } from "src/common/validators/IsRequiredIf";
import { SupplierType } from "@prisma/client";
import { ValidateIfCondition } from "src/common/validators/ValidateIfCondition";

export class CreateSupplierDto {

    @IsEnum(SupplierType, { message: 'El tipo de proveedor (type) es obligatorio y debe ser un valor válido (INDIVIDUAL o COMPANY).' })
    type: SupplierType;

    @ValidateIf(o => o.type === SupplierType.COMPANY || o.name !== undefined)
    // @IsMutuallyExclusive(['personId'], {
    //     message: 'El campo originBranchId no debe estar presente si existe name.',
    // })
    @ValidateIfCondition(
        (o) =>
            o.type === SupplierType.COMPANY,
        { message: 'El campo name no debe estar presente si el tipo de proveedor es (INDIVIDUAL).' }
    )
    @IsRequiredIf(
        (o) => o.type === SupplierType.COMPANY,
        { message: 'El campo name es obligatorio si el name no está presente.' }
    )
    @IsString({ message: 'El nombre debe ser un texto.' })
    // @IsNotEmpty({ message: 'El nombre es obligatorio.' })
    name?: string;

    @ValidateIf(o => o.type === SupplierType.INDIVIDUAL || o.personId !== undefined)
    // @IsMutuallyExclusive(['name'], {
    //     message: 'El campo originBranchId no debe estar presente si existe name.',
    // })
    @ValidateIfCondition(
        (o) =>
            o.type === SupplierType.INDIVIDUAL,
        { message: 'El campo personId no debe estar presente si el tipo de proveedor es (COMPANY).' }
    )
    @IsRequiredIf(
        (o) => o.type === SupplierType.INDIVIDUAL,
        { message: 'El campo personId es obligatorio si el name no está presente.' }
    )
    @IsUUID('all', { message: 'El ID de la persona (personId) debe ser un UUID válido.' })
    personId?: string;

    @IsOptional()
    @IsString({ message: 'La dirección debe ser un texto.' })
    address?: string;

    @IsOptional()
    @IsString({ message: 'La ciudad debe ser un texto.' })
    city?: string;

    @IsOptional()
    @IsString({ message: 'El estado o provincia deb ser un texto' })
    state?: string;

    @IsOptional()
    @IsString({ message: 'El país debe ser un texto.' })
    country?: string;

    @IsOptional()
    @IsString({ message: 'El codigo postal debe ser un texto.' })
    zipCode?: string;

    @IsOptional()
    @IsUrl({}, { message: 'La URL del sitio web no es válida.' })
    websiteUrl?: string;

    @ValidateIf(o => o.type === SupplierType.COMPANY || o.taxId !== undefined)
    @ValidateIfCondition(
        (o) =>
            o.type === SupplierType.COMPANY,
        { message: 'El campo taxId no debe estar presente si el tipo de proveedor es (INDIVIDUAL).' }
    )
    // @IsRequiredIf(
    //     (o) => o.type === SupplierType.COMPANY,
    //     { message: 'El campo taxId es obligatorio si el name no está presente.' }
    // )
    @IsString({ message: 'El número de identificación físcal (taxId) debe ser un texto.' })
    taxId?: string;

    @IsOptional()
    @IsBoolean({ message: 'El valor deve ser verdadero o falso.' })
    isActive?: boolean;

    @IsOptional()
    @IsArray({ message: 'Debe proporcionar una lista de contactos válida.' })
    @ValidateNested({ each: true })
    @Type(() => ContactInfoDto)
    contactsInfo: ContactInfoDto[]
}
