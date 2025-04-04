import { PartialType } from '@nestjs/mapped-types';
import { CreateProductDto } from './create-product.dto';
import { IsNotEmpty, IsString, IsUUID, ValidateIf } from 'class-validator';
import { IsUnique } from 'src/common/validators';

export class UpdateProductDto extends PartialType(CreateProductDto) {


    @IsString({ message: "El id debe ser un texto." })
    @IsNotEmpty({ message: "El id del producto es requerido." })
    id: string

    // @IsString({ message: "El nombre del producto debe ser un texto válido." })
    // @IsNotEmpty({ message: 'El nombre del producto es obligatorio' })
    @IsUnique('product', 'name', { message: "El nombre del producto debe ser único" }, 'id')
    name: string;

}
