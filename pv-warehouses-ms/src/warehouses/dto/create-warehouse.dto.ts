import { IsArray, IsDefined, IsLatitude, IsLongitude, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateIf, ValidateNested } from "class-validator";
import { WarehouseBranchDto } from "./warehouse-branch.dto";
import { Type } from "class-transformer";
import { UsersAccess } from "./user-access.dto";

export class CreateWarehouseDto {
    @IsString()
    @IsNotEmpty({ message: 'El nombre es obligatorio' })
    name: string;

    @IsString()
    @IsNotEmpty({ message: 'La ubicación es obligatoria' })
    location: string;

    @IsOptional()
    @IsLatitude({ message: 'La latitud debe ser válida' })
    latitude?: number;

    @IsOptional()
    @IsLongitude({ message: 'La longitud debe ser válida' })
    longitude?: number

    @IsOptional()
    @IsString({ message: "La URL de la imagen(imageUrl) debe ser un texto válido." })
    imageUrl?: string;

    @IsOptional()
    @IsArray({ message: 'Debe agregar las sucursales que usarán el almacen.' })
    @ValidateNested({ each: true })
    @Type(() => WarehouseBranchDto)
    branches?: WarehouseBranchDto[];

    @IsArray({ message: 'Debe agregar las usuarios que tendrán acceso a este almacén.' })
    @ValidateNested({ each: true })
    @Type(() => UsersAccess)
    usersAccess?: UsersAccess[];

}
