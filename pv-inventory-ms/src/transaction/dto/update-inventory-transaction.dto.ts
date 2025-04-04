import { PartialType } from '@nestjs/mapped-types';
import { CreateInventoryTransactionDto } from './create-inventory-transaction.dto';
import { IsString } from 'class-validator';

export class UpdateInventoryTransactionDto extends PartialType(CreateInventoryTransactionDto) {
  @IsString()
  id: string;
}
