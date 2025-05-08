import { PartialType } from '@nestjs/mapped-types';
import { CreateInventoryMovementDto } from './create-inventory-movement.dto';
import { IsString } from 'class-validator';

export class UpdateInventoryMovementDto extends PartialType(CreateInventoryMovementDto) {
  @IsString()
  id: string;
}
