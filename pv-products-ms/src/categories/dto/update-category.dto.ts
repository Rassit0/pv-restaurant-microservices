import { PartialType } from '@nestjs/mapped-types';
import { CreateCategoryDto } from './create-category.dto';
import { IsArray, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ParentHierarchyDto } from './patern_hierarchy.dto';

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {

  @IsString({message:"El id debe ser un texto."})
  @IsNotEmpty({message: "El id de la categoría es requerido."})
  id:string

  @IsString({ message: 'El nombre debe ser un texto' })
  @MaxLength(100, { message: 'El nombre no puede tener más de 100 caracteres' })
  name: string;
}
