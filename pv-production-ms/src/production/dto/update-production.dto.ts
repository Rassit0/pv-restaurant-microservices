import { PartialType } from '@nestjs/mapped-types';
import { CreateProductionDto } from './create-production.dto';
import { IsUUID } from 'class-validator';

export class UpdateProductionDto extends PartialType(CreateProductionDto) {
  @IsUUID('all', { message: 'El ID de la receta que crea la receta debe ser un UUID válido.' })
  id: string;
}
