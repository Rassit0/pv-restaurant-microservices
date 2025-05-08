import { PartialType } from '@nestjs/mapped-types';
import { CreateSupplierDto } from './create-supplier.dto';
import { IsString, IsUUID, ValidateIf } from 'class-validator';
import { ValidateIfCondition } from 'src/common/validators/ValidateIfCondition';
import { SupplierType } from '@prisma/client';

export class UpdateSupplierDto extends PartialType(CreateSupplierDto) {
  @IsUUID()
  id: string;

  @ValidateIf(o => o.type === SupplierType.COMPANY || o.taxId !== undefined)
  @ValidateIfCondition(
    (o) =>
      o.type === SupplierType.COMPANY,
    { message: 'El campo taxId no debe estar presente si el tipo de proveedor es (INDIVIDUAL).' }
  )
  // @IsRequiredIf(
  //     (o) => o.type === SupplierType.COMPANY,
  //     { message: 'El campo taxId es obligatorio si el name no está presente.' }
  // )
  @IsString({ message: 'El número de identificación físcal (taxId) debe ser un texto.' })
  taxId?: string;
}
