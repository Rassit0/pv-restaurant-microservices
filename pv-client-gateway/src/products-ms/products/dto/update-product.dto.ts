import { PartialType } from '@nestjs/mapped-types';
import { CreateProductDto } from './create-product.dto';
import { IsNotEmpty, IsString, ValidateIf } from 'class-validator';

export class UpdateProductDto extends PartialType(CreateProductDto) {
    @ValidateIf((obj) => obj.name !== undefined)
    @IsString({ message: "El nombre del producto debe ser un texto válido." })
    @IsNotEmpty({ message: 'El nombre del producto es obligatorio' })
    name: string;
}
