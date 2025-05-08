import { StatusInventoryMovement } from "@prisma/client";
import { Type } from "class-transformer";
import { IsArray, IsDecimal, IsEnum, IsNotEmpty, IsOptional, IsUUID, Validate, ValidateIf, ValidateNested } from "class-validator";
import { ValidateIfCondition } from "src/common/validators/ValidateIfCondition";
import { IsRequiredIf } from "../../common/validators/IsRequiredIf";

enum DeliveryStatusDetail {
    // PENDING // Pendiente de entrega
    COMPLETE = 'COMPLETE', // Entregado completamente
    PARTIAL = 'PARTIAL', // Entregado parcialmente
    NOT_DELIVERED = 'NOT_DELIVERED', // No entregado
    OVER_DELIVERED = 'OVER_DELIVERED'// Entregado en exceso
}


class CreateInventoryMovementDetailDto {
    @IsUUID()
    @IsNotEmpty({ message: 'El ID (id) del detalle es obligatorio.' })
    id: string;

    @IsUUID()
    @IsNotEmpty({ message: 'El ID (productId) del producto es obligatorio.' })
    productId: string;

    @ValidateIfCondition(
        (o) =>
            o.deliveryStatus !== DeliveryStatusDetail.COMPLETE &&
            o.deliveryStatus !== DeliveryStatusDetail.NOT_DELIVERED,
        { message: 'El campo deliveredQuantity no debe estar presente si el estado de entrega (deliveryStatus) no es de PARTIAL O OVER_DELIVERED.' }
    )
    @IsDecimal(
        { force_decimal: true, decimal_digits: '2', locale: 'en-US' },
        { message: 'La cantidad entregada debe ser un número decimal con dos decimales.' }
    )
    @IsNotEmpty({ message: 'La cantidad entregada es obligatoria.' })
    deliveredQuantity?: string;

    @IsNotEmpty({ message: 'El campo deliveryStatus del detalle es obligatorio.' })
    @IsEnum(DeliveryStatusDetail, { message: 'El campo deliveryStatus es obligatorio y debe ser: PENDING, COMPLETE, PARTIAL, NOT_DELIVERED o OVER_DELIVERED.' })
    deliveryStatus: DeliveryStatusDetail;
}

export class ChangeStatusDto {
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
    @ValidateIf((o) => o.status !== StatusInventoryMovement.ACCEPTED)
    // Valida que los detalles del movimiento sean un arreglo válido y opcional
    @IsArray({ message: 'Debe agregar los detalles del movimiento.' })
    @ValidateNested({ each: true })
    @Type(() => CreateInventoryMovementDetailDto)
    inventoryMovementDetails?: CreateInventoryMovementDetailDto[];

    @IsEnum(StatusInventoryMovement)
    status: StatusInventoryMovement;
}