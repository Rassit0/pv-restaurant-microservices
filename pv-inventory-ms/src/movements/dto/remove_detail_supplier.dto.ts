import { PartialType } from '@nestjs/mapped-types';
import { CreateInventoryMovementDto } from './create-inventory-movement.dto';
import { IsString, IsUUID } from 'class-validator';

export class DeleteDetailSupplierDto{
  @IsUUID('all', {message:"El ID debe ser un UUID válido"})
  id: string;

  @IsUUID('all', {message:"El ID (deletedByUserId) debe ser un UUID válido"})
  deletedByUserId: string;
}
