import { AdjustmentType, InventoryMovementType, StatusInventoryMovement } from "@prisma/client";
import { Type } from "class-transformer";
import { IsArray, IsDecimal, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateNested } from "class-validator";
import { IsISO8601DateString } from "src/common/validators";



export class CreateBranchStockDto {
    @IsOptional()
    @IsUUID()
    originBranchId?: string;

    @IsOptional()
    @IsUUID()
    originWarehouseId?: string;

    @IsOptional()
    @IsUUID()
    // @IsNotEmpty({ message: 'El ID de la sucursal es obligatorio.' })
    branchId: string;

    @IsDecimal(
        { force_decimal: true, decimal_digits: '2', locale: 'en-US' },
        { message: 'La cantidad debe ser un número decimal con dos decimales.' }
    )
    @IsNotEmpty({ message: 'La cantidad en stock es obligatoria.' })
    quantity: number;
}

export class CreateWarehouseStockDto {
    @IsOptional()
    @IsUUID()
    originBranchId?: string;

    @IsOptional()
    @IsUUID()
    originWarehouseId?: string;

    @IsOptional()
    @IsUUID()
    // @IsNotEmpty({ message: 'El ID del almacén es obligatorio.' })
    warehouseId?: string;

    @IsDecimal(
        { force_decimal: true, decimal_digits: '2', locale: 'en-US' },
        { message: 'La cantidad debe ser un número decimal con dos decimales.' }
    )
    @IsNotEmpty({ message: 'La cantidad en stock es obligatoria.' })
    quantity: number;
}
export class CreateInventoryTransactionProductDto {
    // @IsUUID()
    // @IsNotEmpty({ message: 'El ID de la transacción de inventario es obligatorio.' })
    // inventoryTransactionId: string;

    @IsUUID()
    @IsNotEmpty({ message: 'El ID del producto es obligatorio.' })
    productId: string;

    // @IsDecimal(
    //     { force_decimal: true, decimal_digits: '2', locale: 'en-US' },
    //     { message: 'La cantidad debe ser un número decimal con dos decimales.' }
    // )
    // @IsNotEmpty({ message: 'La cantidad es obligatoria.' })
    // quantity: number;

    @IsString({ message: 'La unidad debe ser un valor de tipo texto.' })
    @IsNotEmpty({ message: 'La unidad de medida es obligatoria.' })
    unit: string;

    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => CreateBranchStockDto)
    branchStock?: CreateBranchStockDto;

    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => CreateWarehouseStockDto)
    warehouseStock?: CreateWarehouseStockDto;
}

export class CreateInventoryTransactionDto {
    @IsEnum(InventoryMovementType, { message: 'El tipo de movimiento es obligatorio y debe ser un valor válido.' })
    movementType: InventoryMovementType;

    @IsOptional()
    @IsEnum(AdjustmentType, { message: 'El tipo de ajuste debe ser un valor válido: INCOME O OUTCOME.' })
    adjustmentType?: AdjustmentType;

    // @IsEnum(StatusInventoryTransaction, { message: 'El estado de la transacción debe ser un valor válido.' })
    // @IsOptional()
    // status?: StatusInventoryTransaction;

    @IsOptional()
    @IsString({ message: 'La descripción debe ser un valor de tipo texto.' })
    description?: string;

    @IsUUID()
    @IsNotEmpty({ message: 'El ID del usuario que realizó el movimiento es obligatorio.' })
    createdByUserId: string;

    @IsOptional()
    @IsArray({ message: 'Debe agregar las sucursales que usarán el almacén.' })
    @ValidateNested({ each: true })
    @Type(() => CreateInventoryTransactionProductDto)
    inventoryTransactionProducts?: CreateInventoryTransactionProductDto[];

    @IsOptional()
    // @IsDateString({ strict: true }, { message: "La fecha de expiración debe ser una fecha válida en formato ISO 8601." })
    @IsISO8601DateString({ message: "La fecha de ingreso(entryDate) debe ser una fecha válida en formato ISO 8601 (ejemplo: '2025-01-01T00:00:00.000Z')." })
    entryDate?: Date;
}