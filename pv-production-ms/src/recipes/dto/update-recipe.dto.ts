import { PartialType } from '@nestjs/mapped-types';
import { CreateRecipeDto } from './create-recipe.dto';
import { IsUUID } from 'class-validator';

export class UpdateRecipeDto extends PartialType(CreateRecipeDto) {

  @IsUUID('all', { message: 'El ID de la receta que crea la receta debe ser un UUID válido.' })
  id: string;
}
