import { PartialType } from '@nestjs/mapped-types';
import { CreatePersonDto } from './create-person.dto';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class UpdatePersonDto extends PartialType(CreatePersonDto) {
  @IsUUID('all', { message: 'El id debe ser un UUID válido.' })
  @IsNotEmpty({ message: "El id del producto es requerido." })
  id: string

  @IsUUID('all', { message: 'El campo updatedByUserId debe ser un UUID válido.' })
  @IsNotEmpty({ message: "El campo 'updatedByUserId' es obligatorio y debe ser un UUID válido." })
  updatedByUserId: string;
}
