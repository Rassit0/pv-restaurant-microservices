import { StatusInventoryMovement } from "@prisma/client";
import { Type } from "class-transformer";
import { ArrayNotEmpty, IsArray, IsDecimal, IsDefined, IsEnum, IsNotEmpty, IsOptional, IsUUID, Validate, ValidateIf, ValidateNested } from "class-validator";
import { ValidateIfCondition } from "src/common/validators/ValidateIfCondition";
import { IsRequiredIf } from "../../common/validators/IsRequiredIf";

enum DeliveryStatusDetail {
    // PENDING // Pendiente de entrega
    COMPLETE = 'COMPLETE', // Entregado completamente
    PARTIAL = 'PARTIAL', // Entregado parcialmente
    NOT_DELIVERED = 'NOT_DELIVERED', // No entregado
    OVER_DELIVERED = 'OVER_DELIVERED'// Entregado en exceso
}

export class UpdateDetailsAndStatusDto {
    @IsUUID()
    id: string;

    @IsUUID()
    @IsNotEmpty({ message: 'El ID del usuario que actualizó el movimiento es obligatorio.' })
    updatedByUserId?: string;

    // @ValidateIfCondition(
    //     (o) =>
    //         o.status !== StatusInventoryMovement.ACCEPTED,
    //     { message: 'El campo inventoryMovementDetails no debe estar presente si el estado del movimiento (status) es confirmado por el encargado (ACCEPTED).' }
    // )
    // @IsRequiredIf(
    //     (o) => o.movementType !== StatusInventoryMovement.ACCEPTED,
    //     { message: 'El campo (description) es obligatorio cuando el estado del movimiento (status) es diferente de ACCEPTED.' }
    // )
    // @IsOptional()
    // @ValidateIf((o) => o.status === StatusInventoryMovement.COMPLETED)
    @IsRequiredIf(
            (o) => o.status === StatusInventoryMovement.COMPLETED,
            { message: 'El campo (inventoryMovementDetails) es obligatorio cuando el tipo de movimiento es COMPLETED.' }
        )
    // Valida que los detalles del movimiento sean un arreglo válido y opcional
    // @IsDefined({ message: 'El campo inventoryMovementDetails es obligatorio cuando el status es COMPLETED.' })
    // @IsArray({ message: 'Debe agregar los detalles del movimiento.' })
    @ValidateNested({ each: true })
    @Type(() => CreateOrUpdateMovementDetailDto)
    inventoryMovementDetails?: CreateOrUpdateMovementDetailDto[];

    @IsOptional()
    @IsEnum(StatusInventoryMovement, { message: 'El campo status es obligatorio y debe ser uno de los siguientes valores: PENDING, ACCEPTED, COMPLETED, CANCELED.' })
    status?: StatusInventoryMovement;
}

class CreateOrUpdateMovementDetailDto {
    // @IsOptional()
    @IsDefined({ message: 'El campo (id) es obligatorio.' })
    @IsUUID()
    @IsNotEmpty({ message: 'El ID (id) del detalle es obligatorio.' })
    id: string;

    @IsUUID()
    @IsNotEmpty({ message: 'El ID (productId) del producto es obligatorio.' })
    productId: string;

    // @ValidateIfCondition(
    //     (o) =>
    //         o.deliveryStatus !== DeliveryStatusDetail.COMPLETE &&
    //         o.deliveryStatus !== DeliveryStatusDetail.NOT_DELIVERED,
    //     { message: 'El campo deliveredQuantity no debe estar presente si el estado de entrega (deliveryStatus) no es de PARTIAL O OVER_DELIVERED.' }
    // )
    // @IsDecimal(
    //     { force_decimal: true, decimal_digits: '2', locale: 'en-US' },
    //     { message: 'La cantidad entregada debe ser un número decimal con dos decimales.' }
    // )
    // @IsNotEmpty({ message: 'La cantidad entregada es obligatoria.' })
    // deliveredQuantity?: string;

    // @IsNotEmpty({ message: 'El campo deliveryStatus del detalle es obligatorio.' })
    // @IsEnum(DeliveryStatusDetail, { message: 'El campo deliveryStatus es obligatorio y debe ser: PENDING, COMPLETE, PARTIAL, NOT_DELIVERED o OVER_DELIVERED.' })
    // deliveryStatus: DeliveryStatusDetail;

    @IsOptional()
    @IsDecimal(
        { force_decimal: true, decimal_digits: '2', locale: 'en-US' },
        { message: 'La cantidad entregada (totalDeliveredQuantity) debe ser un número decimal con dos decimales.' }
    )
    @IsNotEmpty({ message: 'La cantidad entregada es obligatoria.' })
    totalDeliveredQuantity?: string;

    @IsOptional()
    @ArrayNotEmpty({ message: 'Debe agregar al menos un proveedor-cantidad (detailSuppliers).' })
    @ValidateNested({ each: true, message: "El campo debe ser un arreglo." })
    @Type(() => DetailSupplierDto)
    detailSuppliers?: DetailSupplierDto[];
}

class DetailSupplierDto {
    @IsOptional()
    @IsUUID("all", { message: 'El ID del proveedor (supplierId) debe ser un UUID válido.' })
    @IsNotEmpty({ message: 'El ID (id) del detalle es obligatorio.' })
    id?: string;

    @ValidateIf((o) => o.id === undefined, { message: 'El ID del proveedor (supplierId) es obligatorio si el ID del detalle no está definido.' })
    @IsUUID()
    @IsNotEmpty({ message: 'El ID del encargado de entrega (supplierId) es obligatorio.' })
    supplierId?: string;

    @IsOptional()
    @ValidateIf((o) => o.id === undefined, { message: 'El ID del proveedor (supplierId) es obligatorio si el ID del detalle no está definido.' })
    @IsDecimal(
        { force_decimal: true, decimal_digits: '2', locale: 'en-US' },
        { message: 'La cantidad entregada (deliveredQuantity) debe ser un número decimal con dos decimales.' }
    )
    @IsNotEmpty({ message: 'La cantidad entregada es obligatoria.' })
    deliveredQuantity?: string;
}