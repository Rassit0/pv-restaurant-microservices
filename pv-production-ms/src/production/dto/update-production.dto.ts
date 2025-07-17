import { PartialType } from '@nestjs/mapped-types';
import { CreateProductionDto } from './create-production.dto';
import { ArrayMinSize, IsDecimal, IsDefined, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';
import { ProductionOrderStatus, WasteReason } from '@prisma/client';
import { Type } from 'class-transformer';

export class UpdateProductionDto extends PartialType(CreateProductionDto) {
  @IsUUID('all', { message: 'El ID de la receta que crea la receta debe ser un UUID válido.' })
  id: string;

  // @ValidateIf(o => o.status === ProductionOrderStatus.CANCELED || o.productionWaste !== undefined)
  @IsOptional()
  @Type(() => CreateProductionWasteDto)
  @ArrayMinSize(1, { message: 'Debe incluir al menos un detalle de cancelación.' })
  productionWaste?: CreateProductionWasteDto[];
}

export class CreateProductionWasteDto {
  // @IsUUID('all', { message: 'El ID de la orden de producción debe ser un UUID válido.' })
  // productionOrderId: string;

  @IsDefined({ message: "El campo 'productId' es obligatorio." })
  @IsUUID('all', { message: 'El ID del producto debe ser un UUID válido.' })
  productId: string;

  @IsDecimal(
    { force_decimal: true, decimal_digits: '2', locale: 'en-US' },
    { message: 'La cantidad debe ser un número decimal con dos decimales.' }
  )
  @IsNotEmpty({ message: 'El campo "quantity" es obligatorio.' })
  quantity: number;

  @IsDefined({ message: "Debe seleccionar una razón de desperdicio." })
  @IsEnum(WasteReason, { message: "La razón de desperdicio no es válida. Debe ser uno de los valores permitidos: CANCELED, DAMAGED, EXPIRED, RETURNED, OVERPRODUCTION u OTHER." })
  reason: WasteReason;

  @ValidateIf(o => o.status === WasteReason.OTHER || o.reasonDescription !== undefined)
  @IsDefined({ message: "El campo 'status' es obligatorio." })
  @IsString({ message: 'El motivo debe ser un texto.' })
  reasonDescription?: string;
}
