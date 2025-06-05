import { AdjustmentReason, AdjustmentType, DeliveryStatus, InventoryMovementType, StatusInventoryMovement } from "@prisma/client";
import { Type } from "class-transformer";
import { ArrayNotEmpty, IsArray, IsDecimal, IsDefined, IsEnum, IsNotEmpty, IsNotEmptyObject, IsObject, IsOptional, IsString, IsUUID, ValidateIf, ValidateNested } from "class-validator";
import { IsISO8601DateString } from "src/common/validators";
import { ValidateIfCondition } from "src/common/validators/ValidateIfCondition";
import { IsOneOrAnother } from "src/common/validators/IsOneOrAnother";
import { IsRequiredIf } from "src/common/validators/IsRequiredIf";
import { IsOptionalIf } from "src/common/validators/IsOptionalIf";
import { IsEnumIf } from "src/common/validators/IsEnumIf";
import { IsMutuallyExclusive } from "src/common/validators/IsMutuallyExclusive";

class AdjustmentDto {
    @IsEnum(AdjustmentType, { message: 'El tipo de movimiento es obligatorio y debe ser un valor válido(INCOME || OUTCOME).' })
    adjustmentType: AdjustmentType;

    // Valida que la razón del ajuste sea obligatoria si el movimiento es de tipo ADJUSTMENT
    // @IsString({ message: 'La razón (adjustmentReason) de ajuste debe ser un valor de tipo texto.' })
    @IsEnum(AdjustmentReason, { message: 'El campo (adjustmentReason) es obligatorio y debe ser un valor válido("DAMAGE" | "LOSS" | "AUDIT" | "EXCESS" | "OTHER").' })
    adjustmentReason: AdjustmentReason;

    // Campo opcional para describir una razón adicional si el ajuste es "OTHER"
    @IsOptional()
    @IsString({ message: 'La otra razón (otherAdjustmentReason) de ajuste debe ser un valor de tipo texto.' })
    otherAdjustmentReason?: string;
}

export class CreateInventoryMovementDto {
    // Valida que el tipo de movimiento sea uno de los valores permitidos en el enum InventoryMovementType
    @IsEnum(InventoryMovementType, { message: 'El tipo de movimiento es obligatorio y debe ser un valor válido.' })
    movementType: InventoryMovementType;

    @IsRequiredIf(
        (o) => o.movementType === InventoryMovementType.ADJUSTMENT,
        { message: 'El campo adjustment es obligatorio cuando el tipo de movimiento es ADJUSTMENT.' }
    )
    @ValidateIfCondition(
        (o) =>
            o.movementType === InventoryMovementType.ADJUSTMENT,
        { message: 'El campo adjustment no debe estar presente si el tipo de movimiento no es ADJUSTMENT.' }
    )
    @Type(() => AdjustmentDto)
    adjustment?: AdjustmentDto;

    @IsRequiredIf(
        (o) => o.movementType === InventoryMovementType.ADJUSTMENT,
        { message: 'El campo (description) es obligatorio cuando el tipo de movimiento es ADJUSTMENT.' }
    )
    @IsDefined({ message: 'El campo (description) es obligatorio.' })
    // @IsOptional()
    @IsString({ message: 'La descripción debe ser un valor de tipo texto.' })
    description?: string;

    // Valida que el ID del usuario que realizó el movimiento sea obligatorio y un UUID válido
    @IsUUID()
    @IsNotEmpty({ message: 'El ID del usuario que realizó el movimiento es obligatorio.' })
    createdByUserId: string;

    // Valida que los detalles del movimiento sean un arreglo válido y opcional
    @IsArray({ message: 'Debe agregar los detalles del movimiento.' })
    @ValidateNested({ each: true })
    @Type(() => CreateInventoryMovementDetailDto)
    inventoryMovementDetails: CreateInventoryMovementDetailDto[];

    // Valida que la fecha de entrega sea opcional y esté en formato ISO 8601
    @IsOptional()
    @IsISO8601DateString({ message: "La fecha de ingreso(entryDate) debe ser una fecha válida en formato ISO 8601 (ejemplo: '2025-01-01T00:00:00.000Z')." })
    deliveryDate?: Date;

    // Valida que originBranchId sea obligatorio para ciertos tipos de movimiento y no esté presente si originWarehouseId existe
    @ValidateIfCondition(
        (o) =>
            o.movementType === InventoryMovementType.OUTCOME ||
            o.movementType === InventoryMovementType.TRANSFER ||
            (o.movementType === InventoryMovementType.ADJUSTMENT && o.adjustment?.adjustmentType === AdjustmentType.OUTCOME),
        { message: 'El campo originBranchId no debe estar presente si el tipo de movimiento no es de OUTCOME, TRANSFER o adjustmentType(OUTCOME).' }
    )
    // @ValidateIfCondition(
    //     (o) =>
    //         o.originWarehouseId === undefined, // Valida que no exista originWarehouseId
    //     { message: 'El campo originBranchId no debe estar presente si existe originWarehouseId.' }
    // )
    @IsMutuallyExclusive(['originWarehouseId'], {
        message: 'El campo originBranchId no debe estar presente si existe originWarehouseId.',
    })
    @IsRequiredIf(
        (o) => o.movementType === InventoryMovementType.ADJUSTMENT,
        { message: 'El campo adjustmentReason es obligatorio cuando el tipo de movimiento es ADJUSTMENT.' }
    )
    @IsOptional()
    @IsUUID('all', { message: 'El ID de la sucursal de origen (originBranchId) debe ser un UUID válido.' })
    originBranchId?: string;

    // Valida que originWarehouseId sea obligatorio para ciertos tipos de movimiento y no esté presente si originBranchId existe
    @ValidateIfCondition(
        (o) =>
            o.movementType === InventoryMovementType.OUTCOME ||
            o.movementType === InventoryMovementType.TRANSFER ||
            (o.movementType === InventoryMovementType.ADJUSTMENT && o.adjustment?.adjustmentType === AdjustmentType.OUTCOME),
        { message: 'El campo originWarehouseId no debe estar presente si el tipo de movimiento no es OUTCOME, TRANSFER o adjustmentType(OUTCOME).' }
    )
    // @ValidateIfCondition(
    //     (o) =>
    //         o.originBranchId === undefined, // Valida que no exista originBranchId
    //     { message: 'El campo originWarehouseId no debe estar presente si existe originBranchId.' }
    // )
    @IsMutuallyExclusive(['originBranchId'], {
        message: 'El campo originWarehouseId no debe estar presente si existe originBranchId.',
    })
    @IsOptional()
    @IsUUID('all', { message: 'El ID del almacén de origen (originWarehouseId) debe ser un UUID válido.' })
    originWarehouseId?: string;

    // Valida que destinationBranchId sea obligatorio para ciertos tipos de movimiento y no esté presente si destinationWarehouseId existe
    @ValidateIfCondition(
        (o) =>
            o.movementType === InventoryMovementType.INCOME ||
            o.movementType === InventoryMovementType.TRANSFER ||
            (o.movementType === InventoryMovementType.ADJUSTMENT && o.adjustment?.adjustmentType === AdjustmentType.INCOME),
        { message: 'El campo destinationBranchId no debe estar presente si el tipo de movimiento no es INCOME, TRANSFER o adjustmentType(INCOME).' }
    )
    @ValidateIfCondition(
        (o) =>
            o.destinationWarehouseId === undefined, // Valida que no exista destinationWarehouseId
        { message: 'El campo destinationBranchId no debe estar presente si existe destinationWarehouseId.' }
    )
    @IsOptional()
    @IsUUID('all', { message: 'El ID del almacén de destino (destinationBranchId) debe ser un UUID válido.' })
    destinationBranchId?: string;

    // Valida que destinationWarehouseId sea obligatorio para ciertos tipos de movimiento y no esté presente si destinationBranchId existe
    @ValidateIfCondition(
        (o) =>
            o.movementType === InventoryMovementType.INCOME ||
            o.movementType === InventoryMovementType.TRANSFER ||
            (o.movementType === InventoryMovementType.ADJUSTMENT && o.adjustment?.adjustmentType === AdjustmentType.INCOME),
        { message: 'El campo destinationWarehouseId no debe estar presente si el tipo de movimiento no es INCOME, TRANSFER o adjustmentType(INCOME).' }
    )
    @ValidateIfCondition(
        (o) =>
            o.destinationBranchId === undefined, // Valida que no exista destinationBranchId
        { message: 'El campo destinationWarehouseId no debe estar presente si existe destinationBranchId.' }
    )
    @IsOptional()
    @IsUUID('all', { message: 'El ID del almacén de destino (destinationWarehouseId) debe ser un UUID válido.' })
    destinationWarehouseId?: string;

}

class CreateInventoryMovementDetailDto {

    @IsUUID()
    @IsNotEmpty({ message: 'El ID del producto es obligatorio.' })
    productId: string;

    @IsString({ message: 'La unidad debe ser un valor de tipo texto.' })
    @IsNotEmpty({ message: 'La unidad de medida es obligatoria.' })
    unit: string;

    @IsDecimal(
        { force_decimal: true, decimal_digits: '2', locale: 'en-US' },
        { message: 'La cantidad esperada debe ser un número decimal con dos decimales.' }
    )
    @IsNotEmpty({ message: 'La cantidad esperada es obligatoria.' })
    totalExpectedQuantity: string;

    @IsOptional()
    @IsDecimal(
        { force_decimal: true, decimal_digits: '2', locale: 'en-US' },
        { message: 'La cantidad entregada debe ser un número decimal con dos decimales.' }
    )
    @IsNotEmpty({ message: 'La cantidad entregada es obligatoria.' })
    totalDeliveredQuantity?: string;

    @IsOptional()
    @IsEnum(DeliveryStatus)
    deliveryStatus: DeliveryStatus;

    @IsOptional()
    @ArrayNotEmpty({ message: 'Debe agregar al menos un proveedor-cantidad (detailSuppliers).' })
    @ValidateNested({ each: true, message: "El campo debe ser un arreglo." })
    @Type(() => DetailSupplierDto)
    detailSuppliers?: DetailSupplierDto[];
}

// DTO para proveedores
class SupplierDto {
    @IsUUID()
    @IsNotEmpty({ message: 'El ID del proveedor (supplierId) es obligatorio.' })
    id: string;
}

// DTO para encargados de entrega
class DetailSupplierDto {
    @IsUUID()
    @IsNotEmpty({ message: 'El ID del encargado de entrega (deliveryManagerId) es obligatorio.' })
    supplierId: string;

    // @IsDecimal(
    //     { force_decimal: true, decimal_digits: '2', locale: 'en-US' },
    //     { message: 'La cantidad esperada debe ser un número decimal con dos decimales.' }
    // )
    // @IsNotEmpty({ message: 'La cantidad esperada es obligatoria.' })
    // expectedQuantity: string;

    @IsOptional()
    @IsDecimal(
        { force_decimal: true, decimal_digits: '2', locale: 'en-US' },
        { message: 'La cantidad entregada debe ser un número decimal con dos decimales.' }
    )
    @IsNotEmpty({ message: 'La cantidad entregada es obligatoria.' })
    deliveredQuantity?: string;

    // @IsOptional()
    // @IsEnum(DeliveryStatus, { message: 'El campo (deliveryStatus) es obligatorio y debe ser un valor: "PENDING" | "COMPLETE" | "PARTIAL" | "NOT_DELIVERED" | "OVER_DELIVERED".' })
    // deliveryStatus: DeliveryStatus;
}