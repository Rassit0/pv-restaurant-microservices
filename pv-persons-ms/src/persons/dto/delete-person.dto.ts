
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class DeletePersonDto {
  @IsUUID('all', { message: 'El id debe ser un UUID válido.' })
  @IsNotEmpty({ message: "El id del producto es requerido." })
  id: string

  @IsUUID('all', { message: 'El campo updatedByUserId debe ser un UUID válido.' })
  @IsNotEmpty({ message: "El campo 'updatedByUserId' es obligatorio y debe ser un UUID válido." })
  deletedByUserId: string;
}
